import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface RunwareConfig {
  apiKey: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
  cost?: number;
}

export class RunwareProvider {
  private apiKey: string;
  // ✅ Единственный правильный endpoint Runware
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(config: RunwareConfig) {
    this.apiKey = config.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const taskUUID = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Правильная структура запроса по документации Runware
    const payload = [
      {
        taskType: 'videoInference',
        taskUUID,
        positivePrompt: options.prompt,
        // Модели Runware: klingai, alibaba, google, lightricks и т.д.
        model: options.model || 'klingai:kling-v2-5-standard',
        duration: options.duration || 5,
        deliveryMethod: 'async',
        aspectRatio: options.aspectRatio || '16:9',
        outputType: 'URL',
        outputFormat: 'MP4',
        includeCost: true,
      }
    ];

    logger.info(
      { taskUUID, model: payload[0].model, duration: payload[0].duration, prompt: options.prompt.slice(0, 50) },
      'Runware video generation started ($10 FREE credits)'
    );

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const result = response.data?.data?.[0];

      logger.info({ result }, 'Runware video generation response');

      return {
        taskId: result?.taskUUID || taskUUID,
        status: 'queued',
        estimatedTime: 120,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, response: error.response?.data },
        'Runware generation failed'
      );

      if (error.response?.status === 402 || error.response?.data?.[0]?.error?.includes('credit')) {
        throw new Error('RUNWARE_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    // ✅ Правильный способ получения статуса через getResponse
    const payload = [
      {
        taskType: 'getResponse',
        taskUUID: taskId,
      }
    ];

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const result = response.data?.data?.[0];

      if (!result) {
        return { taskId, status: 'processing' };
      }

      // videoURL присутствует = completed
      if (result.videoURL) {
        return {
          taskId,
          status: 'completed',
          videoUrl: result.videoURL,
          cost: result.cost,
        };
      }

      if (result.error) {
        return { taskId, status: 'failed' };
      }

      return { taskId, status: 'processing' };
    } catch (error: any) {
      logger.error({ error: error.message, taskId }, 'Runware status check failed');
      throw error;
    }
  }

  getName(): string {
    return 'Runware-FREE';
  }
}
