import Replicate from 'replicate';
import pino from 'pino';

const logger = pino({ level: 'info' });

// 💰 Актуальные цены Replicate (февраль 2026)
// Источник: https://replicate.com/explore
export const REPLICATE_MODELS = {
  'haiper-v2': {
    id: 'haiper/haiper-video-2',
    pricePerSec: 0.05,
    label: 'Haiper Video 2 (cheapest! $0.25/5sec)',
  },
  'kling-v1.6-pro': {
    id: 'kuaishou/kling-v1-6-pro',
    pricePerSec: 0.098,
    label: 'Kling v1.6 Pro ($0.49/5sec)',
  },
  'veo-2': {
    id: 'google-deepmind/veo-2',
    pricePerSec: 0.50,
    label: 'Veo 2 (max quality, $2.50/5sec)',
  },
};

export type ReplicateModelKey = keyof typeof REPLICATE_MODELS;

interface ReplicateConfig {
  apiToken: string;
}

interface GenerateVideoOptions {
  prompt: string;
  /** Short key like 'haiper-v2' OR full model path 'haiper/haiper-video-2' */
  model?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
  cost?: number;
  modelUsed?: string;
}

export class ReplicateProvider {
  private client: Replicate;

  constructor(config: ReplicateConfig) {
    this.client = new Replicate({ auth: config.apiToken });
  }

  /**
   * Resolve short key OR full model path.
   * Examples:
   *  'haiper-v2' → 'haiper/haiper-video-2'
   *  'haiper/haiper-video-2' → 'haiper/haiper-video-2'
   */
  private resolveModel(model?: string): string {
    if (!model) return REPLICATE_MODELS['haiper-v2'].id;
    const entry = REPLICATE_MODELS[model as ReplicateModelKey];
    if (entry) return entry.id;
    if (model.includes('/')) return model; // already full path
    logger.warn({ model }, 'Unknown Replicate model, using haiper-v2');
    return REPLICATE_MODELS['haiper-v2'].id;
  }

  private estimatedCost(modelId: string, duration: number): number {
    const entry = Object.values(REPLICATE_MODELS).find(m => m.id === modelId);
    return entry ? +(entry.pricePerSec * duration).toFixed(4) : 0;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const modelId = this.resolveModel(options.model);
    const duration = options.duration || 5;
    const cost = this.estimatedCost(modelId, duration);

    logger.info(
      { model: modelId, duration, estimatedCost: `$${cost}` },
      '🎬 Replicate: starting video generation (pay-as-you-go, $0 minimum)'
    );

    try {
      const prediction = await this.client.predictions.create({
        model: modelId,
        input: {
          prompt: options.prompt,
          duration,
          aspect_ratio: options.aspectRatio || '16:9',
        },
      });

      logger.info({ predictionId: prediction.id, status: prediction.status }, 'Replicate prediction created');

      return {
        taskId: prediction.id,
        status: prediction.status === 'succeeded' ? 'completed' : 'queued',
        videoUrl: prediction.output ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string) : undefined,
        estimatedTime: 90,
        cost,
        modelUsed: modelId,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, model: modelId },
        'Replicate generation failed'
      );

      // Check if error is related to credits/billing
      const errMsg = error.message?.toLowerCase() || '';
      if (errMsg.includes('credit') || errMsg.includes('billing') || errMsg.includes('payment')) {
        throw new Error('REPLICATE_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    try {
      const prediction = await this.client.predictions.get(taskId);

      logger.info({ taskId, status: prediction.status }, 'Replicate status check');

      if (prediction.status === 'succeeded') {
        const videoUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : (prediction.output as string);

        logger.info({ taskId, videoUrl }, '✅ Replicate video completed!');

        return {
          taskId,
          status: 'completed',
          videoUrl,
        };
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        logger.error({ taskId, error: prediction.error }, 'Replicate task failed');
        return { taskId, status: 'failed' };
      }

      // starting, processing
      return { taskId, status: 'processing' };
    } catch (error: any) {
      logger.error({ taskId, error: error.message }, 'Replicate status check failed');
      throw error;
    }
  }

  getName(): string {
    return 'Replicate';
  }
}
