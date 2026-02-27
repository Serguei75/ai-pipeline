import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

// 💰 Актуальные цены Replicate (февраль 2026)
// Источник: https://replicate.com/pricing
export const REPLICATE_MODELS = {
  'haiper-v2':      { id: 'haiper/haiper-video-2', version: 'latest', pricePerSec: 0.05,  label: 'Haiper v2 (cheapest!)' },
  'kling-v1.6-pro': { id: 'kuaishou/kling-v1-6-pro', version: 'latest', pricePerSec: 0.098, label: 'Kling v1.6 Pro' },
  'veo-2':          { id: 'google-deepmind/veo-2', version: 'latest', pricePerSec: 0.50,  label: 'Veo 2 (max quality)' },
  'luma-dream':     { id: 'luma-ai/luma-dream-machine', version: 'latest', pricePerSec: 0.08, label: 'Luma Dream Machine' },
};

interface ReplicateConfig {
  apiToken: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  cost?: number;
  estimatedTime?: number;
}

export class ReplicateProvider {
  private apiToken: string;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor(config: ReplicateConfig) {
    this.apiToken = config.apiToken;
  }

  private resolveModel(model?: string): { id: string; version: string; pricePerSec: number } {
    const entry = REPLICATE_MODELS[model as keyof typeof REPLICATE_MODELS];
    return entry || REPLICATE_MODELS['haiper-v2'];
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const modelInfo = this.resolveModel(options.model);
    const duration = options.duration || 5;
    const estimatedCost = duration * modelInfo.pricePerSec;

    logger.info(
      { model: modelInfo.id, duration, estimatedCost: `$${estimatedCost.toFixed(2)}` },
      'Replicate: starting video generation (pay-as-you-go, no minimum)'
    );

    try {
      // Replicate Predictions API
      const response = await axios.post(
        `${this.baseUrl}/predictions`,
        {
          version: modelInfo.id,
          input: {
            prompt: options.prompt,
            duration_in_seconds: duration,
            aspect_ratio: options.aspectRatio || '16:9',
          },
        },
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait', // Wait for prediction to start
          },
          timeout: 30000,
        }
      );

      const prediction = response.data;

      logger.info({ predictionId: prediction.id, status: prediction.status }, 'Replicate prediction created');

      return {
        taskId: prediction.id,
        status: prediction.status === 'succeeded' ? 'completed' : prediction.status === 'failed' ? 'failed' : 'processing',
        videoUrl: prediction.output?.[0] || prediction.output,
        cost: estimatedCost,
        estimatedTime: 90,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, response: error.response?.data },
        'Replicate generation failed'
      );

      if (error.response?.status === 402 || error.response?.data?.detail?.includes('payment')) {
        throw new Error('REPLICATE_PAYMENT_REQUIRED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/predictions/${taskId}`,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
          timeout: 10000,
        }
      );

      const prediction = response.data;

      if (prediction.status === 'succeeded') {
        return {
          taskId,
          status: 'completed',
          videoUrl: prediction.output?.[0] || prediction.output,
        };
      }

      if (prediction.status === 'failed') {
        return { taskId, status: 'failed', cost: 0 };
      }

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
