import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface FalAIConfig {
  apiKey: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: 'wan-2.1' | 'luma-ray-2' | 'kling-1.5';
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
}

interface VideoResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
}

export class FalAIProvider {
  private apiKey: string;
  private baseUrl = 'https://fal.run';

  constructor(config: FalAIConfig) {
    this.apiKey = config.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const model = options.model || 'fal-ai/wan-2.1';
    const endpoint = `${this.baseUrl}/${model}`;

    const payload = {
      prompt: options.prompt,
      video_size: options.aspectRatio === '9:16' ? '768x1280' : '1280x720',
    };

    logger.info({ prompt: options.prompt.slice(0, 50), model }, 'Fal.ai video generation started (FREE credits)');

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const requestId = response.data.request_id;

      logger.info({ requestId }, 'Fal.ai generation request submitted');

      return {
        taskId: requestId,
        status: 'queued',
        estimatedTime: 120,
      };
    } catch (error: any) {
      logger.error({ error: error.message, status: error.response?.status }, 'Fal.ai generation failed');
      
      if (error.response?.data?.error?.includes('quota') || error.response?.status === 402) {
        throw new Error('FALAI_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  async getStatus(taskId: string): Promise<VideoResult> {
    const endpoint = `${this.baseUrl}/fal-ai/wan-2.1/requests/${taskId}`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 10000,
      });

      const status = response.data.status;
      const isCompleted = status === 'COMPLETED';
      const isFailed = status === 'FAILED';

      return {
        taskId,
        status: isCompleted ? 'completed' : isFailed ? 'failed' : 'processing',
        videoUrl: response.data.video?.url || response.data.images?.[0]?.url,
        estimatedTime: isCompleted ? 0 : 120,
      };
    } catch (error: any) {
      logger.error({ error: error.message, taskId }, 'Fal.ai status check failed');
      throw error;
    }
  }

  getName(): string {
    return 'FalAI-FREE';
  }
}
