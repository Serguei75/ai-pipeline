import axios from 'axios';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ level: 'info' });

// ✅ Актуальные модели Runware
// Источник: https://runware.ai/docs/video-inference/api-reference
export const RUNWARE_MODELS = {
  // 💚 FREE tier priority (дешевле = больше роликов за $10)
  'wan-2.6-flash':       { id: 'alibaba:wan-2.6-flash',       pricePerSec: 0.04, label: 'Wan 2.6 Flash (~50 videos/$10)' },
  'kling-v2-5-standard': { id: 'klingai:kling-v2-5-standard', pricePerSec: 0.07, label: 'Kling v2.5 Standard (~28 videos/$10)' },
  'kling-v2-5-pro':      { id: 'klingai:kling-v2-5-pro',      pricePerSec: 0.10, label: 'Kling v2.5 Pro (~20 videos/$10)' },
  // 💰 Paid tier
  'veo-3-fast':          { id: 'google:veo-3-fast',           pricePerSec: 0.25, label: 'Veo 3 Fast (~8 videos/$10)' },
  'veo-3':               { id: 'google:veo-3',                pricePerSec: 0.40, label: 'Veo 3 (~5 videos/$10)' },
};

export type RunwareModelKey = keyof typeof RUNWARE_MODELS;

interface RunwareConfig {
  apiKey: string;
}

interface GenerateVideoOptions {
  prompt: string;
  /** Short key e.g. 'wan-2.6-flash' or full id 'alibaba:wan-2.6-flash' */
  model?: string;
  duration?: 5 | 10;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
  cost?: number;
  modelUsed?: string;
}

export class RunwareProvider {
  private apiKey: string;
  // ✅ Единственный правильный endpoint Runware
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(config: RunwareConfig) {
    this.apiKey = config.apiKey;
  }

  /** Resolve short key OR full model id */
  private resolveModel(model?: string): string {
    if (!model) return RUNWARE_MODELS['wan-2.6-flash'].id;
    const entry = RUNWARE_MODELS[model as RunwareModelKey];
    if (entry) return entry.id;
    if (model.includes(':')) return model; // already full id
    logger.warn({ model }, 'Unknown Runware model key, falling back to wan-2.6-flash');
    return RUNWARE_MODELS['wan-2.6-flash'].id;
  }

  private estimatedCost(modelId: string, duration: number): number {
    const entry = Object.values(RUNWARE_MODELS).find(m => m.id === modelId);
    return entry ? +(entry.pricePerSec * duration).toFixed(4) : 0;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const taskUUID = uuidv4();
    const modelId  = this.resolveModel(options.model);
    const duration = options.duration || 5;
    const cost     = this.estimatedCost(modelId, duration);

    // ✅ Правильная структура payload — массив объектов
    const payload = [
      {
        taskType:        'videoInference',
        taskUUID,
        positivePrompt:  options.prompt,
        model:           modelId,
        duration,
        deliveryMethod:  'async',
        aspectRatio:     options.aspectRatio || '16:9',
        outputType:      'URL',
        outputFormat:    'MP4',
        includeCost:     true,
      },
    ];

    logger.info(
      { taskUUID, model: modelId, duration, estimatedCost: `$${cost}` },
      '🎬 Runware: starting video generation'
    );

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      });

      const data = response.data?.data?.[0];
      logger.info({ responseData: data }, 'Runware API response received');

      return {
        taskId:        data?.taskUUID || taskUUID,
        status:        'queued',
        estimatedTime: 120,
        cost,
        modelUsed:     modelId,
      };
    } catch (error: any) {
      const errBody = error.response?.data;
      logger.error(
        { status: error.response?.status, body: errBody, message: error.message },
        'Runware generation failed'
      );
      const bodyStr = JSON.stringify(errBody ?? '');
      if (
        error.response?.status === 402 ||
        bodyStr.toLowerCase().includes('credit') ||
        bodyStr.toLowerCase().includes('balance') ||
        bodyStr.toLowerCase().includes('insufficient')
      ) {
        throw new Error('RUNWARE_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    // ✅ getResponse — правильный способ получения результата async-задачи
    const payload = [
      {
        taskType: 'getResponse',
        taskUUID: taskId,
      },
    ];

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      });

      const result = response.data?.data?.[0];

      if (!result) return { taskId, status: 'processing' };

      // Наличие videoURL = задача завершена
      if (result.videoURL) {
        logger.info({ taskId, videoURL: result.videoURL, cost: result.cost }, '✅ Runware video completed!');
        return {
          taskId,
          status:   'completed',
          videoUrl: result.videoURL,
          cost:     result.cost,
        };
      }

      if (result.error || result.taskType === 'error') {
        logger.error({ result }, 'Runware task failed');
        return { taskId, status: 'failed' };
      }

      return { taskId, status: 'processing' };
    } catch (error: any) {
      logger.error({ taskId, message: error.message }, 'Runware getStatus failed');
      throw error;
    }
  }

  getName(): string { return 'Runware-FREE'; }
}
