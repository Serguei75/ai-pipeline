import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

interface KieAIWebhookPayload {
  id: string;
  type: 'image.generated' | 'video.completed' | 'video.failed';
  status: string;
  output?: {
    url?: string;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
  };
  created_at: string;
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/webhooks/kieai
   * Kie.ai Webhook handler for async notifications
   */
  app.post('/webhooks/kieai', async (request, reply) => {
    try {
      // Проверяем webhook signature
      const signature = request.headers['x-kieai-signature'] as string;
      const webhookSecret = process.env.KIEAI_WEBHOOK_SECRET;

      if (!signature || !webhookSecret) {
        app.log.warn('Missing webhook signature or secret');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Верифицируем подпись
      const body = JSON.stringify(request.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        app.log.warn({ signature, expectedSignature }, 'Invalid webhook signature');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      // Обрабатываем webhook
      const payload = request.body as KieAIWebhookPayload;
      
      app.log.info({
        webhookId: payload.id,
        type: payload.type,
        status: payload.status
      }, 'Kie.ai webhook received');

      switch (payload.type) {
        case 'image.generated':
          app.log.info({ 
            id: payload.id, 
            url: payload.output?.url 
          }, 'Image generation completed');
          // TODO: Сохранить результат в БД
          break;

        case 'video.completed':
          app.log.info({
            id: payload.id,
            videoUrl: payload.output?.video_url,
            duration: payload.output?.duration
          }, 'Video generation completed');
          // TODO: Сохранить результат в БД
          break;

        case 'video.failed':
          app.log.error({
            id: payload.id,
            status: payload.status
          }, 'Video generation failed');
          // TODO: Обработать ошибку
          break;
      }

      reply.send({ success: true });
    } catch (error: any) {
      app.log.error(error, 'Webhook processing error');
      reply.status(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/webhooks/health
   * Webhook health check
   */
  app.get('/webhooks/health', async (request, reply) => {
    reply.send({ 
      status: 'ok', 
      webhookConfigured: !!process.env.KIEAI_WEBHOOK_SECRET,
      webhookUrl: process.env.KIEAI_WEBHOOK_URL
    });
  });
};
