import { VideoResult } from './kieai-veo.provider.js';
import { randomUUID } from 'crypto';

export class MockVideoProvider {
  async generateVideo(prompt: string, options: any = {}): Promise<VideoResult> {
    const id = `mock_${randomUUID()}`;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      id,
      status: 'completed',
      videoUrl: `https://storage.mock.ai/${id}.mp4`,
      thumbnailUrl: `https://storage.mock.ai/${id}_thumb.jpg`,
      duration: options.duration || 10,
      costUsd: 0,
    };
  }

  async getStatus(jobId: string): Promise<VideoResult> {
    return {
      id: jobId,
      status: 'completed',
      videoUrl: `https://storage.mock.ai/${jobId}.mp4`,
      thumbnailUrl: `https://storage.mock.ai/${jobId}_thumb.jpg`,
      duration: 10,
    };
  }

  getName(): string {
    return 'Mock-Video';
  }
}
