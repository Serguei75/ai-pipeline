import axios from 'axios';

interface KieAIVideoConfig {
  apiKey: string;
  baseUrl?: string;
}

interface GenerateVideoOptions {
  model?: 'veo-3' | 'runway-gen3';
  prompt_enhance?: boolean;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: number;
}

interface VideoGenerationResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export class KieAIVideoProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: KieAIVideoConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.kie.ai';
  }

  async generateVideo(prompt: string, options: GenerateVideoOptions = {}): Promise<VideoGenerationResult> {
    // Veo 3 endpoint
    const endpoint = `${this.baseUrl}/v1/videos/generations`;

    const response = await axios.post(
      endpoint,
      {
        model: options.model || 'veo-3',
        prompt: prompt,
        prompt_enhance: options.prompt_enhance !== false,
        aspect_ratio: options.aspect_ratio || '16:9',
        duration: options.duration || 10
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000
      }
    );

    return {
      id: response.data.id,
      status: response.data.status || 'queued',
      videoUrl: response.data.output?.video_url,
      thumbnailUrl: response.data.output?.thumbnail_url,
      duration: response.data.output?.duration
    };
  }

  async getVideoStatus(jobId: string): Promise<VideoGenerationResult> {
    const endpoint = `${this.baseUrl}/v1/videos/${jobId}`;

    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000
    });

    return {
      id: response.data.id,
      status: response.data.status,
      videoUrl: response.data.output?.video_url,
      thumbnailUrl: response.data.output?.thumbnail_url,
      duration: response.data.output?.duration
    };
  }

  getName(): string {
    return 'KieAI-Video';
  }
}
