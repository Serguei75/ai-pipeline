/**
 * Event Bus consumer for Cost Tracker.
 * Listens to ai-pipeline:events (Redis Streams) and records cost events
 * automatically when pipeline steps complete.
 *
 * No manual tracking needed — every module publishes events,
 * Cost Tracker subscribes and calculates costs in real-time.
 */
import { createClient } from 'redis';
import { config } from '../config.js';
import { recordCostEvent, updateVideoRevenue } from './cost.service.js';
import * as pino from 'pino';

const logger = pino.default({ level: 'info' });

type StreamResult = { name: string; messages: Array<{ id: string; message: Record<string, string> }> };

export class CostEventConsumer {
  private redis: ReturnType<typeof createClient> | null = null;
  private running = false;

  async start(): Promise<void> {
    this.redis = createClient({ url: config.REDIS_URL });
    this.redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    await this.redis.connect();
    this.running = true;
    logger.info('Cost Tracker event consumer started');
    void this.consumeLoop();
  }

  private async consumeLoop(): Promise<void> {
    while (this.running && this.redis?.isReady) {
      try {
        const results = (await this.redis.xReadGroup(
          'cost-tracker', 'tracker-1',
          [{ key: 'ai-pipeline:events', id: '>' }],
          { COUNT: 20, BLOCK: 5_000 }
        )) as StreamResult[] | null;

        if (!results) continue;

        for (const stream of results) {
          for (const msg of stream.messages) {
            await this.handleEvent(msg.message).catch((err) =>
              logger.error({ err, msgId: msg.id }, 'Failed to handle cost event')
            );
            await this.redis!.xAck('ai-pipeline:events', 'cost-tracker', msg.id);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('NOGROUP')) {
          await this.redis!.xGroupCreate('ai-pipeline:events', 'cost-tracker', '0', { MKSTREAM: true });
        } else {
          logger.error({ err }, 'Consumer loop error');
          await new Promise((r) => setTimeout(r, 2_000));
        }
      }
    }
  }

  private async handleEvent(msg: Record<string, string>): Promise<void> {
    const { type, payload } = msg;
    if (!type || !payload) return;
    const data: Record<string, any> = JSON.parse(payload);
    const vid = data.videoId;
    const ch  = data.channelId ?? 'default';
    if (!vid) return;

    switch (type) {
      // --- LLM costs ---
      case 'llm.tokens_used':
        await recordCostEvent(vid, ch, 'llm_input',  data.provider, data.inputTokens,  'tokens', `${data.provider}:input`,  { task: data.task });
        await recordCostEvent(vid, ch, 'llm_output', data.provider, data.outputTokens, 'tokens', `${data.provider}:output`, { task: data.task });
        break;

      // --- TTS costs ---
      case 'tts.synthesis_completed':
        await recordCostEvent(vid, ch, 'tts_chars', data.provider, data.characters, 'characters', `${data.provider}:chars`, { voiceId: data.voiceId });
        break;

      // --- Media (HeyGen avatar video) ---
      case 'media.render_completed':
        await recordCostEvent(vid, ch, 'media_minutes', 'heygen', data.durationSeconds / 60, 'minutes', 'heygen:minutes', { quality: data.quality });
        break;

      // --- Thumbnail generation ---
      case 'thumbnail.generated':
        for (const variant of (data.variants ?? [])) {
          await recordCostEvent(
            vid, ch, 'image_generation', variant.provider,
            1, 'image', `${variant.provider}:image`,
            { variantId: variant.id, style: variant.style }
          );
        }
        break;

      // --- Revenue update from Analytics ---
      case 'analytics.revenue_updated':
        await updateVideoRevenue(vid, data.revenueUsd, data.views ?? 0);
        break;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.redis?.disconnect();
    logger.info('Cost Tracker consumer stopped');
  }
}
