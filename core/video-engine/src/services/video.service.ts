import { AIMLAPIProvider } from '../providers/aimlapi.provider.js';
import { FalAIProvider } from '../providers/fal.provider.js';
import { KieAIVeoProvider } from '../providers/kieai-veo.provider.js';
import { MockVideoProvider } from '../providers/mock.provider.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
  userId?: string;
}

interface VideoGenerationResult {
  jobId: string;
  providerJobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  costUsd?: number;
  estimatedTime?: number;
  provider?: string;
  tier?: 'free' | 'paid';
}

export class VideoService {
  private providers: Array<{
    name: string;
    instance: any;
    enabled: boolean;
    tier: 'free' | 'paid';
  }> = [];

  constructor() {
    // Priority 1: AIMLAPI (FREE 10 min/месяц)
    if (process.env.AIMLAPI_API_KEY) {
      this.providers.push({
        name: 'AIMLAPI',
        instance: new AIMLAPIProvider({ apiKey: process.env.AIMLAPI_API_KEY }),
        enabled: true,
        tier: 'free',
      });
      logger.info('✅ AIMLAPI provider loaded (FREE 10 min/month)');
    } else {
      logger.warn('⚠️ AIMLAPI_API_KEY not set, skipping FREE tier');
    }

    // Priority 2: Fal.ai (FREE $10-20 credits)
    if (process.env.FALAI_API_KEY) {
      this.providers.push({
        name: 'FalAI',
        instance: new FalAIProvider({ apiKey: process.env.FALAI_API_KEY }),
        enabled: true,
        tier: 'free',
      });
      logger.info('✅ Fal.ai provider loaded (FREE $10-20 credits)');
    } else {
      logger.warn('⚠️ FALAI_API_KEY not set, skipping FREE tier');
    }

    // Priority 3: Kie.ai (PAID)
    if (process.env.KIEAI_API_KEY) {
      this.providers.push({
        name: 'KieAI',
        instance: new KieAIVeoProvider({
          apiKey: process.env.KIEAI_API_KEY,
          baseUrl: process.env.KIEAI_BASE_URL || 'https://api.kie.ai',
          webhookUrl: process.env.KIEAI_WEBHOOK_URL,
        }),
        enabled: true,
        tier: 'paid',
      });
      logger.info('✅ Kie.ai provider loaded (PAID)');
    } else {
      logger.warn('⚠️ KIEAI_API_KEY not set, skipping PAID tier');
    }

    // Fallback: Mock (всегда доступен)
    this.providers.push({
      name: 'Mock',
      instance: new MockVideoProvider(),
      enabled: true,
      tier: 'free',
    });
    logger.info('✅ Mock provider loaded (always available)');

    logger.info(`📦 Total providers loaded: ${this.providers.length}`);
    logger.info(`📊 Provider chain: ${this.providers.map(p => `${p.name}(${p.tier})`).join(' → ')}`);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Пробуем провайдеры по порядку (FREE → PAID → Mock)
    for (const provider of this.providers) {
      if (!provider.enabled) continue;

      try {
        logger.info(
          { provider: provider.name, tier: provider.tier, prompt: request.prompt.slice(0, 50) },
          `Attempting video generation`
        );

        const result = await provider.instance.generateVideo({
          prompt: request.prompt,
          duration: request.duration,
          aspectRatio: request.aspectRatio,
          model: request.model,
        });

        logger.info(
          { provider: provider.name, taskId: result.taskId, tier: provider.tier },
          `✅ Video generation started`
        );

        return {
          jobId: result.taskId,
          providerJobId: result.taskId,
          status: result.status,
          videoUrl: result.videoUrl,
          estimatedTime: result.estimatedTime,
          provider: provider.name,
          tier: provider.tier,
          costUsd: provider.tier === 'free' ? 0 : 0.15,
          duration: request.duration || 10,
        };
      } catch (error: any) {
        // Если лимит исчерпан - пробуем следующий провайдер
        if (error.message.includes('LIMIT_EXCEEDED')) {
          logger.warn(
            { provider: provider.name, tier: provider.tier },
            `⚠️ Free tier limit exceeded, trying next provider`
          );
          continue;
        }

        // Другие ошибки - тоже пробуем следующий
        logger.error(
          { provider: provider.name, error: error.message },
          `❌ Provider failed, trying next`
        );
        continue;
      }
    }

    throw new Error('All providers failed or exhausted');
  }

  async getStatus(taskId: string): Promise<VideoGenerationResult> {
    // Определяем провайдер по префиксу taskId
    let provider = this.providers[0]; // Default to first provider

    if (taskId.startsWith('mock_')) {
      provider = this.providers.find(p => p.name === 'Mock') || this.providers[0];
    }

    const result = await provider.instance.getStatus(taskId);

    return {
      jobId: result.taskId,
      providerJobId: result.taskId,
      status: result.status,
      videoUrl: result.videoUrl,
      costUsd: provider.tier === 'free' ? 0 : 0.15,
      duration: 10,
      provider: provider.name,
      tier: provider.tier,
    };
  }
}
