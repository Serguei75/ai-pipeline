import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface KieAIWebhookPayload {
  id: string;
  type: 'video.completed' | 'video.failed';
  status: string;
  output?: {
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
  };
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/webhooks/kieai', async (request, reply) => {
    try {
      const signature = request.headers['x-kieai-signature'] as string;
      const webhookSecret = process.env.KIEAI_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        const body = JSON.stringify(request.body);
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(body)
          .digest('hex');

        if (signature !== expectedSignature) {
          app.log.warn('Invalid webhook signature');
          return reply.code(401).send({ error: 'Invalid signature' });
        }
      }

      const payload = request.body as KieAIWebhookPayload;
      app.log.info({ webhookId: payload.id, type: payload.type }, 'Webhook received');

      const job = await prisma.videoJob.findFirst({
        where: { providerJobId: payload.id },
      });

      if (!job) {
        app.log.warn({ providerJobId: payload.id }, 'Job not found for webhook');
        return reply.code(404).send({ error: 'Job not found' });
      }

      await prisma.videoJob.update({
        where: { id: job.id },
        data: {
          status: payload.type === 'video.completed' ? 'completed' : 'failed',
          videoUrl: payload.output?.video_url,
          thumbnailUrl: payload.output?.thumbnail_url,
          completedAt: payload.type === 'video.completed' ? new Date() : null,
          errorMessage: payload.type === 'video.failed' ? payload.status : null,
        },
      });

      app.log.info({ jobId: job.id }, 'Video job updated from webhook');

      return reply.send({ success: true });
    } catch (error: any) {
      app.log.error({ error }, 'Webhook processing error');
      return reply.code(500).send({ error: error.message });
    }
  });

  app.get('/api/webhooks/health', async (request, reply) => {
    return reply.send({ 
      status: 'ok',
      webhookConfigured: !!process.env.KIEAI_WEBHOOK_SECRET
    });
  });
};
