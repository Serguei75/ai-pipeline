import { FastifyPluginAsync } from 'fastify';
import { VideoService } from '../services/video.service.js';

const videoService = new VideoService();

export const videoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/videos/generate', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await videoService.generateVideo({
        prompt: body.prompt,
        model: body.model,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution,
        fps: body.fps,
        userId: body.userId,
      });
      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  app.get('/api/videos/status/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const result = await videoService.getStatus(jobId);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  app.get('/api/videos/health', async (request, reply) => {
    return reply.send({ 
      status: 'ok', 
      service: 'video-engine',
      provider: process.env.KIEAI_API_KEY ? 'kieai' : 'mock'
    });
  });
};
