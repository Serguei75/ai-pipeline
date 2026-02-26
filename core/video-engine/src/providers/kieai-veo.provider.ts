import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface KieAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface GenerateVideoOptions {
  model?: 'veo-3' | 'runway-gen3';
  duration?: 5 | 10 | 15;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  promptEnhance?: boolean;
}

export interface VideoResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  costUsd?: number;
}

export class KieAIVeoProvider {
  private apiKey: string;
  private baseUrl: string;
  
  private readonly PRICING = {
    'veo-3': { '5s': 0.10, '10s': 0.20, '15s': 0.30 },
    'runway-gen3': { '5s': 0.05, '10s': 0.10, '15s': 0.15 },
  };

  constructor(config: KieAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.kie.ai';
  }

  async generateVideo(prompt: string, options: GenerateVideoOptions = {}): Promise<VideoResult> {
    const model = options.model || 'veo-3';
    const duration = options.duration || 10;
    
    logger.info({ prompt, model, duration }, 'Submitting video generation to Kie.ai');

    try {
      const endpoint = `${this.baseUrl}/v1/videos/generations`;
      
      const response = await axios.post(
        endpoint,
        {
          model: model === 'veo-3' ? 'google/veo-3' : 'runwayml/gen3-alpha',
          prompt,
          prompt_enhance: options.promptEnhance ?? true,
          aspect_ratio: options.aspectRatio || '16:9',
          duration,
          resolution: options.resolution || '1080p',
          fps: options.fps || 30,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000,
        }
      );

      const data = response.data;
      const costKey = `${duration}s` as '5s' | '10s' | '15s';
      const cost = this.PRICING[model][costKey];

      return {
        id: data.id,
        status: data.status || 'queued',
        videoUrl: data.output?.video_url,
        thumbnailUrl: data.output?.thumbnail_url,
        duration: data.output?.duration,
        costUsd: cost,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Kie.ai video generation failed');
      throw new Error(`KieAI generation failed: ${error.message}`);
    }
  }

  async getStatus(jobId: string): Promise<VideoResult> {
    try {
      const endpoint = `${this.baseUrl}/v1/videos/${jobId}`;
      
      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 30000,
      });

      const data = response.data;

      return {
        id: data.id,
        status: data.status,
        videoUrl: data.output?.video_url,
        thumbnailUrl: data.output?.thumbnail_url,
        duration: data.output?.duration,
      };
    } catch (error: any) {
      logger.error({ error: error.message, jobId }, 'Failed to get video status');
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  getName(): string {
    return 'KieAI-Veo';
  }
}
