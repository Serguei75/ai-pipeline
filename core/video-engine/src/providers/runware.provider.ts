import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface RunwareConfig {
  apiKey: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: 'wan-2.6' | 'kling-2.5' | 'seedream-2.0';
  duration?: 5 | 10 | 20;
  aspectRatio?: '16:9' | '9:16';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
}

export class RunwareProvider {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(config: RunwareConfig) {
    this.apiKey = config.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const endpoint = `${this.baseUrl}/video/text-to-video`;

    const payload = {
      prompt: options.prompt,
      model: options.model || 'wan-2.6',
      duration: options.duration || 10,
      aspect_ratio: options.aspectRatio || '16:9',
    };

    logger.info({ prompt: options.prompt.slice(0, 50), model: payload.model }, 'Runware video generation started ($10 FREE credits)');

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      logger.info({ taskId: response.data.id }, 'Runware video generation started');

      return {
        taskId: response.data.id,
        status: 'queued',
        estimatedTime: 90,
      };
    } catch (error: any) {
      logger.error({ error: error.message, status: error.response?.status }, 'Runware generation failed');
      
      if (error.response?.status === 402 || error.response?.data?.error?.includes('credit')) {
        throw new Error('RUNWARE_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    const endpoint = `${this.baseUrl}/video/status/${taskId}`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });

      const status = response.data.status?.toLowerCase() || 'processing';
      
      return {
        taskId,
        status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing',
        videoUrl: response.data.output?.url,
        estimatedTime: status === 'completed' ? 0 : 90,
      };
    } catch (error: any) {
      logger.error({ error: error.message, taskId }, 'Runware status check failed');
      throw error;
    }
  }

  getName(): string {
    return 'Runware-FREE';
  }
}
