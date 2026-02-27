import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface KieAIVeoConfig {
  apiKey: string;
  baseUrl?: string;
  webhookUrl?: string;
}

interface GenerateVideoOptions {
  prompt: string;
  model?: 'veo3' | 'veo3_fast';
  aspectRatio?: '16:9' | '9:16' | 'Auto';
  seeds?: number;
  watermark?: string;
  enableTranslation?: boolean;
  imageUrls?: string[];
  generationType?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO';
}

interface VideoGenerationResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedTime?: number;
}

interface StatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: 0 | 1 | 2 | 3;
    resultUrls?: string;
    createTime?: string;
  };
}

export class KieAIVeoProvider {
  private apiKey: string;
  private baseUrl: string;
  private webhookUrl?: string;

  constructor(config: KieAIVeoConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.kie.ai';
    this.webhookUrl = config.webhookUrl;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoGenerationResult> {
    const endpoint = `${this.baseUrl}/api/v1/veo/generate`;

    const payload = {
      prompt: options.prompt,
      model: options.model || 'veo3_fast',
      aspect_ratio: options.aspectRatio || '16:9',
      enableTranslation: options.enableTranslation ?? true,
      ...(options.seeds && { seeds: options.seeds }),
      ...(options.watermark && { watermark: options.watermark }),
      ...(this.webhookUrl && { callBackUrl: this.webhookUrl }),
      ...(options.imageUrls && { imageUrls: options.imageUrls }),
      ...(options.generationType && { generationType: options.generationType }),
    };

    logger.info({ endpoint, prompt: options.prompt.slice(0, 50) }, 'Sending Veo 3.1 generation request');

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      logger.info({ response: response.data }, 'Veo 3.1 generation response');

      if (response.data.code === 200) {
        return {
          taskId: response.data.data.taskId,
          status: 'queued',
          estimatedTime: 120,
        };
      } else {
        throw new Error(`Kie.ai API error: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error: any) {
      logger.error({ error: error.message, response: error.response?.data }, 'Veo generation failed');
      throw new Error(`Video generation failed: ${error.response?.data?.msg || error.message}`);
    }
  }

  async getStatus(taskId: string): Promise<VideoGenerationResult> {
    const endpoint = `${this.baseUrl}/api/v1/veo/record-info?taskId=${taskId}`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });

      const data = response.data.data;

      if (data.successFlag === 1) {
        const videoUrls = JSON.parse(data.resultUrls || '[]');
        return {
          taskId: data.taskId,
          status: 'completed',
          videoUrl: videoUrls[0],
        };
      } else if (data.successFlag === 2 || data.successFlag === 3) {
        return {
          taskId: data.taskId,
          status: 'failed',
        };
      } else {
        return {
          taskId: data.taskId,
          status: 'processing',
        };
      }
    } catch (error: any) {
      logger.error({ error: error.message, taskId }, 'Status check failed');
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  getName(): string {
    return 'KieAI-Veo3';
  }
}
