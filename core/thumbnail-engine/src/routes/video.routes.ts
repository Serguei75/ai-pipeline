import { FastifyPluginAsync } from 'fastify';
import { VideoService } from '../services/video.service.js';

export const videoRoutes: FastifyPluginAsync = async (app) => {
  const videoService = new VideoService();

  /**
   * POST /videos/generate
   * Generate video using KieAI
   */
  app.post('/videos/generate', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await videoService.generateVideo({
        prompt: body.prompt,
        model: body.model,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ 
        error: error.message,
        status: 'failed'
      });
    }
  });

  /**
   * GET /videos/status/:jobId
   * Get video generation status
   */
  app.get('/videos/status/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const result = await videoService.getStatus(jobId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ 
        error: error.message,
        status: 'failed'
      });
    }
  });
};
