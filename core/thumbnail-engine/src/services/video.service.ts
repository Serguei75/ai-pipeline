import { KieAIVideoProvider } from '../providers/kieai-video-provider.js';

interface VideoGenerationRequest {
  prompt: string;
  model?: 'veo-3.1' | 'runway-aleph' | 'luma-ray-2';
  duration?: 5 | 10 | 15;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p' | '4k';
}

export class VideoService {
  private kieaiProvider: KieAIVideoProvider;

  constructor() {
    const apiKey = process.env.KIEAI_API_KEY;
    if (!apiKey) {
      throw new Error('KIEAI_API_KEY not found');
    }

    this.kieaiProvider = new KieAIVideoProvider({
      apiKey,
      baseUrl: process.env.KIEAI_BASE_URL
    });
  }

  async generateVideo(request: VideoGenerationRequest) {
    return await this.kieaiProvider.generateVideo(request.prompt, {
      model: request.model,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution
    });
  }

  async getStatus(jobId: string) {
    return await this.kieaiProvider.getVideoStatus(jobId);
  }
}
