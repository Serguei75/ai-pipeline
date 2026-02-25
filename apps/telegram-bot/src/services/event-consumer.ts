import { createClient } from 'redis';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { bot } from '../bot.js';

type RedisMessage = { id: string; message: Record<string, string> };
type StreamResult = { name: string; messages: RedisMessage[] };

/**
 * Event Bus consumer — listens to Redis Streams (ai-pipeline:events)
 * Sends Telegram push notifications for important pipeline events.
 */
export class NotificationConsumer {
  private redis: ReturnType<typeof createClient> | null = null;
  private running = false;

  async start(): Promise<void> {
    this.redis = createClient({ url: config.REDIS_URL });
    this.redis.on('error', (err) => logger.error({ err }, 'Redis client error'));
    await this.redis.connect();
    this.running = true;
    logger.info('Notification consumer started');
    void this.consumeLoop();
  }

  private async consumeLoop(): Promise<void> {
    while (this.running && this.redis?.isReady) {
      try {
        const results = (await this.redis.xReadGroup(
          'telegram-bot',
          'bot-1',
          [{ key: 'ai-pipeline:events', id: '>' }],
          { COUNT: 10, BLOCK: 5_000 }
        )) as StreamResult[] | null;

        if (!results) continue;

        for (const stream of results) {
          for (const msg of stream.messages) {
            await this.handleEvent(msg.message);
            await this.redis!.xAck('ai-pipeline:events', 'telegram-bot', msg.id);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('NOGROUP')) {
          await this.redis!.xGroupCreate('ai-pipeline:events', 'telegram-bot', '0', {
            MKSTREAM: true,
          });
        } else {
          logger.error({ err }, 'Consumer loop error');
          await new Promise((r) => setTimeout(r, 2_000));
        }
      }
    }
  }

  private async handleEvent(message: Record<string, string>): Promise<void> {
    const { type, payload } = message;
    if (!type) return;

    const data: Record<string, any> = payload ? JSON.parse(payload) : {};
    const uid = config.TELEGRAM_ALLOWED_USER_ID;

    const send = (text: string) =>
      bot.api.sendMessage(uid, text, { parse_mode: 'Markdown' }).catch((err) =>
        logger.error({ err, type }, 'Failed to send notification')
      );

    switch (type) {
      case 'topic.approved':
        await send(`🎯 *Тема одобрена!*\n\n${data.title ?? ''}\n\nScript Engine начинает работу...`);
        break;

      case 'script.approved':
        await send(`📝 *Скрипт одобрен → Media Engine*\n\n${data.title ?? ''}`);
        break;

      case 'analytics.hook_weak':
        await send(
          `⚠️ *Слабый хук обнаружен*\n\n` +
            `Retention@8sec: ${data.retentionAt8Sec}%\n` +
            `Видео: ${data.videoTitle ?? data.videoId}\n\n` +
            `Необходима доработка хука.`
        );
        break;

      case 'analytics.niche_underperforming':
        await send(
          `📉 *Ниша слабо работает*\n\n` +
            `${data.niche ?? 'N/A'}: RPM $${data.actualRPM?.toFixed(2)} vs ожидаемых $${data.expectedRPM?.toFixed(2)}`
        );
        break;

      case 'localization.completed':
        await send(
          `🌍 *Локализация готова!*\n\n` +
            `${data.videoTitle ?? data.taskId}\nЯзыки: ${data.languages?.join(', ') ?? 'N/A'}`
        );
        break;

      case 'community.topic_exported':
        await send(
          `💬 *Новая тема из комментариев*\n\n«${data.title ?? ''}»\n\nДобавлена в очередь тем.`
        );
        break;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.redis?.disconnect();
    logger.info('Notification consumer stopped');
  }
}
