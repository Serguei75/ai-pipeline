import Fastify from 'fastify';
import { config } from './config.js';
import { thumbnailRoutes } from './routes/thumbnail.routes.js';
import { healthRoutes } from './routes/health.js';
import { videoRoutes } from './routes/video.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';
import pino from 'pino';

const logger = pino({
  level: 'info',
  ...(config.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const app = Fastify({ logger: false });

app.addHook('onError', (_req, _rep, error, done) => {
  logger.error({ error }, 'Unhandled route error');
  done();
});

await app.register(thumbnailRoutes);
await app.register(healthRoutes);
await app.register(videoRoutes);
await app.register(webhookRoutes);

await app.listen({ port: Number(config.PORT), host: '0.0.0.0' });
logger.info(
  { port: config.PORT },
  '🖼 Thumbnail Engine running — Imagen 4 Fast/Standard/Ultra + GPT Image 1.5 + KieAI Video + Webhooks'
);

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
