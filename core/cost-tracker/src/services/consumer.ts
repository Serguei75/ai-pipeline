import Redis from 'ioredis';
import { getPrisma } from './prisma';

const STREAM_KEY = 'ai-pipeline:events';
const CONSUMER_GROUP = 'cost-tracker';
const CONSUMER_NAME = `cost-tracker-${process.pid}`;

// Кокой модуль породил событие
const EVENT_TO_MODULE: Record<string, string> = {
  'thumbnail.generated':             'thumbnail-engine',
  'thumbnail.ab_test_winner':        'thumbnail-engine',
  'voice.generated':                 'voice-engine',
  'script.generated':                'script-engine',
  'script.approved':                 'script-engine',
  'topic.approved':                  'topic-engine',
  'localization.completed':          'localization-engine',
  'hook_tester.winner_selected':     'hook-tester',
  'media.ready':                     'media-engine',
};

// Инференция провайдера если не указан явно
const MODULE_DEFAULT_PROVIDER: Record<string, string> = {
  'script-engine':         'openai',
  'topic-engine':          'openai',
  'voice-engine':          'elevenlabs',
  'localization-engine':   'openai',
  'thumbnail-engine':      'huggingface',
  'hook-tester':           'openai',
  'media-engine':          'internal',
};

interface EventPayload {
  jobId?: string;
  videoId?: string;
  costUsd?: number;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  characters?: number;
  steps?: number;
  durationSec?: number;
}

export class CostConsumer {
  private redis: Redis;
  private running = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (e: Error) => console.warn('[Consumer] Redis:', e.message));
  }

  private async ensureGroup() {
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message?.includes('BUSYGROUP')) console.warn('[Consumer] Group:', e.message);
    }
  }

  async start() {
    try {
      await this.redis.connect();
      await this.ensureGroup();
      this.running = true;
      console.log('📡 Cost Tracker consumer listening on', STREAM_KEY);
      this.loop();
    } catch (e) {
      console.warn('⚠️  Redis unavailable, cost tracking from events disabled:', (e as Error).message);
    }
  }

  stop() {
    this.running = false;
    this.redis.disconnect();
  }

  private parseFields(raw: string[]): Record<string, string> {
    const r: Record<string, string> = {};
    for (let i = 0; i < raw.length; i += 2) r[raw[i]] = raw[i + 1];
    return r;
  }

  private async loop() {
    while (this.running) {
      try {
        const results = await (this.redis as any).xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', '20', 'BLOCK', '5000',
          'STREAMS', STREAM_KEY, '>'
        ) as Array<[string, Array<[string, string[]]>]> | null;

        if (!results) continue;
        for (const [, entries] of results) {
          for (const [id, raw] of entries) {
            const fields = this.parseFields(raw);
            const type = fields.type || '';
            const payload: EventPayload = fields.payload ? JSON.parse(fields.payload) : {};
            if (EVENT_TO_MODULE[type] !== undefined || (payload.costUsd !== undefined && payload.costUsd > 0)) {
              await this.record(type, payload);
            }
            await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, id);
          }
        }
      } catch (err) {
        console.error('[Consumer] Loop error:', (err as Error).message);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  private async record(type: string, p: EventPayload) {
    const costUsd = p.costUsd ?? 0;
    const module   = EVENT_TO_MODULE[type] || 'unknown';
    const provider = p.provider || MODULE_DEFAULT_PROVIDER[module] || 'unknown';
    const model    = p.model    || 'unknown';

    const prisma = getPrisma();
    try {
      await prisma.costEntry.create({
        data: {
          module, provider, model,
          videoId:      p.videoId,
          jobId:        p.jobId,
          eventType:    type,
          inputTokens:  p.inputTokens,
          outputTokens: p.outputTokens,
          characters:   p.characters,
          steps:        p.steps,
          durationSec:  p.durationSec,
          costUsd,
        },
      });

      // Ежедневный агрегат
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.dailyCostSummary.upsert({
        where: { date_module_provider: { date: today, module, provider } },
        create: { date: today, module, provider, totalCostUsd: costUsd, requestCount: 1 },
        update: { totalCostUsd: { increment: costUsd }, requestCount: { increment: 1 } },
      });

      if (costUsd > 0) console.log(`💰 [CostTracker] ${type} | ${module} | $${costUsd}`);
    } catch (e) {
      console.error('[CostTracker] DB write failed:', (e as Error).message);
    }
  }
}
