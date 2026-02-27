import { randomUUID } from 'crypto';

interface VideoResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  costUsd?: number;
}

interface GenerateVideoOptions {
  prompt: string;
  duration?: number;
}

export class MockVideoProvider {
  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
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

  async getStatus(taskId: string): Promise<VideoResult> {
    return {
      id: taskId,
      status: 'completed',
      videoUrl: `https://storage.mock.ai/${taskId}.mp4`,
      thumbnailUrl: `https://storage.mock.ai/${taskId}_thumb.jpg`,
      duration: 10,
      costUsd: 0,
    };
  }

  getName(): string {
    return 'Mock-Video';
  }
}
