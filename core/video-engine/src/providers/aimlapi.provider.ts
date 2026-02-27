import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface AIMLAPIConfig {
  apiKey: string;
  baseUrl?: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: 'runway-gen4-turbo' | 'runway-gen4' | 'runway-gen4.5';
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
}

export class AIMLAPIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIMLAPIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.aimlapi.com';
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const endpoint = `${this.baseUrl}/v1/video/generate`;

    const payload = {
      prompt: options.prompt,
      model: options.model || 'runway-gen4-turbo',
      duration: options.duration || 10,
      aspect_ratio: options.aspectRatio || '16:9',
    };

    logger.info({ prompt: options.prompt.slice(0, 50), model: payload.model }, 'AIMLAPI video generation started (FREE tier)');

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      logger.info({ taskId: response.data.id }, 'AIMLAPI video generation started');

      return {
        taskId: response.data.id,
        status: 'queued',
        estimatedTime: 90,
      };
    } catch (error: any) {
      logger.error({ error: error.message, status: error.response?.status }, 'AIMLAPI generation failed');
      
      if (error.response?.status === 429 || error.response?.data?.error?.includes('quota')) {
        throw new Error('AIMLAPI_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    const endpoint = `${this.baseUrl}/v1/video/status/${taskId}`;

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
        status: status === 'succeeded' ? 'completed' : status === 'failed' ? 'failed' : 'processing',
        videoUrl: response.data.output?.video_url,
        estimatedTime: status === 'succeeded' ? 0 : 90,
      };
    } catch (error: any) {
      logger.error({ error: error.message, taskId }, 'AIMLAPI status check failed');
      throw error;
    }
  }

  getName(): string {
    return 'AIMLAPI-FREE';
  }
}
