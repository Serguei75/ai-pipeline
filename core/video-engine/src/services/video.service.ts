import { KieAIVeoProvider } from './kieai-veo.provider.js';
import { MockVideoProvider } from './mock.provider.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface VideoGenerationRequest {
  prompt: string;
  model?: 'veo3' | 'veo3_fast' | 'mock';
  duration?: 5 | 10 | 15;
  aspectRatio?: '16:9' | '9:16';
  userId?: string;
}

interface VideoGenerationResult {
  jobId: string;
  providerJobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  costUsd?: number;
  estimatedTime?: number;
}

export class VideoService {
  private kieaiProvider?: KieAIVeoProvider;
  private mockProvider: MockVideoProvider;

  constructor() {
    const apiKey = process.env.KIEAI_API_KEY;

    if (apiKey) {
      this.kieaiProvider = new KieAIVeoProvider({
        apiKey,
        baseUrl: process.env.KIEAI_BASE_URL || 'https://api.kie.ai',
        webhookUrl: process.env.KIEAI_WEBHOOK_URL,
      });
      logger.info('KieAI Veo provider initialized');
    } else {
      logger.warn('KIEAI_API_KEY not found, using Mock provider only');
    }

    this.mockProvider = new MockVideoProvider();
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const useMock = request.model === 'mock' || !this.kieaiProvider;

    if (useMock) {
      logger.info({ prompt: request.prompt }, 'Using Mock provider');
      const result = await this.mockProvider.generateVideo({
        prompt: request.prompt,
        duration: request.duration || 10,
      });
      return {
        jobId: result.id,
        providerJobId: result.id,
        status: result.status,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        costUsd: result.costUsd,
      };
    }

    logger.info({ prompt: request.prompt, model: request.model }, 'Using KieAI Veo provider');
    const result = await this.kieaiProvider.generateVideo({
      prompt: request.prompt,
      model: request.model === 'veo3' ? 'veo3' : 'veo3_fast',
      aspectRatio: request.aspectRatio || '16:9',
      watermark: 'AI Pipeline',
    });

    return {
      jobId: result.taskId,
      providerJobId: result.taskId,
      status: result.status,
      videoUrl: result.videoUrl,
      estimatedTime: result.estimatedTime,
      costUsd: 0.15,
    };
  }

  async getStatus(taskId: string): Promise<VideoGenerationResult> {
    if (taskId.startsWith('mock_')) {
      const result = await this.mockProvider.getStatus(taskId);
      return {
        jobId: result.id,
        providerJobId: result.id,
        status: result.status,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        costUsd: result.costUsd,
      };
    }

    if (!this.kieaiProvider) {
      throw new Error('KieAI provider not available');
    }

    const result = await this.kieaiProvider.getStatus(taskId);
    return {
      jobId: result.taskId,
      providerJobId: result.taskId,
      status: result.status,
      videoUrl: result.videoUrl,
      costUsd: 0.15,
    };
  }
}
