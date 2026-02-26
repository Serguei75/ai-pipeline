import Fastify from 'fastify';
import { videoRoutes } from './routes/video.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = Fastify({ logger: false });

const PORT = parseInt(process.env.PORT || '3011');

async function start() {
  await app.register(videoRoutes);
  await app.register(webhookRoutes);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  
  logger.info(`🎬 Video Engine running on http://0.0.0.0:${PORT}`);
  logger.info(`   POST /api/videos/generate — генерация видео`);
  logger.info(`   GET  /api/videos/status/:id — статус задачи`);
  logger.info(`   GET  /api/videos/health — health check`);
  logger.info(`   POST /api/webhooks/kieai — webhook от Kie.ai`);
}

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch(err => {
  logger.error(err, 'Fatal error');
  process.exit(1);
});
