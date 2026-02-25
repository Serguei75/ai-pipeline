import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { costRoutes } from './routes/costs';
import { healthRoutes } from './routes/health';
import { CostConsumer } from './services/consumer';
import { disconnectPrisma } from './services/prisma';

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
});

async function start(): Promise<void> {
  await app.register(cors, { origin: '*' });
  await app.register(costRoutes);
  await app.register(healthRoutes);

  // Запуск Event Bus consumer
  const consumer = new CostConsumer();
  await consumer.start();

  const port = parseInt(process.env.PORT || '3010');
  await app.listen({ port, host: '0.0.0.0' });

  console.log(`\n💰 Cost Tracker  →  http://localhost:${port}`);
  console.log(`   GET  /costs/summary    — итоги по модулю/провайдеру`);
  console.log(`   GET  /costs/daily      — график расходов`);
  console.log(`   GET  /costs/roi/:id    — ROI конкретного видео`);
  console.log(`   GET  /health\n`);

  const shutdown = async () => {
    consumer.stop();
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(err => { console.error('Fatal:', err); process.exit(1); });
