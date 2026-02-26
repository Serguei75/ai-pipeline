import { PrismaClient } from '@prisma/client';
import { KieAIVeoProvider, VideoResult } from '../providers/kieai-veo.provider.js';
import { MockVideoProvider } from '../providers/mock.provider.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const prisma = new PrismaClient();

interface GenerateVideoRequest {
  prompt: string;
  model?: 'veo-3' | 'runway-gen3' | 'mock';
  duration?: 5 | 10 | 15;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  userId?: string;
}

export class VideoService {
  private kieaiProvider: KieAIVeoProvider | null = null;
  private mockProvider: MockVideoProvider;

  constructor() {
    const apiKey = process.env.KIEAI_API_KEY;
    
    if (apiKey) {
      this.kieaiProvider = new KieAIVeoProvider({
        apiKey,
        baseUrl: process.env.KIEAI_BASE_URL,
      });
    } else {
      logger.warn('KIEAI_API_KEY not found, using Mock provider only');
    }

    this.mockProvider = new MockVideoProvider();
  }

  async generateVideo(request: GenerateVideoRequest) {
    const { prompt, model = 'veo-3', userId } = request;

    logger.info({ prompt, model }, 'Video generation requested');

    let provider: KieAIVeoProvider | MockVideoProvider;
    let providerName: string;

    if (model === 'mock' || !this.kieaiProvider) {
      provider = this.mockProvider;
      providerName = 'mock';
    } else {
      provider = this.kieaiProvider;
      providerName = 'kieai';
    }

    const job = await prisma.videoJob.create({
      data: {
        prompt,
        model,
        status: 'queued',
        duration: request.duration || 10,
        aspectRatio: request.aspectRatio || '16:9',
        resolution: request.resolution || '1080p',
        fps: request.fps || 30,
        provider: providerName,
        userId,
      },
    });

    try {
      const result = await provider.generateVideo(prompt, {
        model: model === 'mock' ? undefined : model,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        fps: request.fps,
      });

      await prisma.videoJob.update({
        where: { id: job.id },
        data: {
          status: result.status,
          providerJobId: result.id,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          costUsd: result.costUsd || 0,
          updatedAt: new Date(),
        },
      });

      logger.info({ jobId: job.id, providerJobId: result.id }, 'Video generation submitted');

      return {
        jobId: job.id,
        providerJobId: result.id,
        status: result.status,
        estimatedTime: (request.duration || 10) * 6,
      };
    } catch (error: any) {
      logger.error({ error: error.message, jobId: job.id }, 'Video generation failed');

      await prisma.videoJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  async getStatus(jobId: string) {
    const job = await prisma.videoJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return {
        jobId: job.id,
        status: job.status,
        videoUrl: job.videoUrl,
        thumbnailUrl: job.thumbnailUrl,
        duration: job.duration,
        costUsd: job.costUsd,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
    }

    if (job.providerJobId && job.provider === 'kieai' && this.kieaiProvider) {
      try {
        const result = await this.kieaiProvider.getStatus(job.providerJobId);

        await prisma.videoJob.update({
          where: { id: jobId },
          data: {
            status: result.status,
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl,
            completedAt: result.status === 'completed' ? new Date() : null,
          },
        });

        return {
          jobId: job.id,
          status: result.status,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: job.duration,
          costUsd: job.costUsd,
        };
      } catch (error: any) {
        logger.error({ error: error.message, jobId }, 'Polling failed');
      }
    }

    return {
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      duration: job.duration,
      costUsd: job.costUsd,
    };
  }
}
