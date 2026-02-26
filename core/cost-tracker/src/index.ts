import Fastify from 'fastify';
import { config } from './config.js';
import { costRoutes } from './routes/cost.routes.js';
import { healthRoutes } from './routes/health.js';
import { CostEventConsumer } from './services/event-consumer.js';
import * as pino from 'pino';

const logger = pino.default({
  level: 'info',
  ...(config.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const app = Fastify({ logger: false });
const consumer = new CostEventConsumer();

await app.register(costRoutes);
await app.register(healthRoutes);

// Start Event Bus consumer
await consumer.start().catch((err) => {
  logger.warn({ err }, 'Event consumer failed — cost tracking via REST API only');
});

await app.listen({ port: Number(config.PORT), host: '0.0.0.0' });
logger.info({ port: config.PORT }, '💰 Cost Tracker running');

const shutdown = async (): Promise<void> => {
  await consumer.stop();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
