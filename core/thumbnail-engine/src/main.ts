import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { generateRoutes } from './routes/generate';
import { healthRoutes } from './routes/health';
import { abTestRoutes } from './routes/ab-test';
import { ensureStorageDir } from './services/storage';
import { disconnectPrisma } from './services/prisma';

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
});

async function start(): Promise<void> {
  await ensureStorageDir();

  await app.register(cors, { origin: '*' });

  const storagePath = process.env.STORAGE_PATH
    || path.join(process.cwd(), 'storage', 'thumbnails');

  await app.register(fastifyStatic, {
    root: storagePath,
    prefix: '/static/',
  });

  await app.register(generateRoutes);
  await app.register(healthRoutes);
  await app.register(abTestRoutes);   // ←── A/B Tester

  const port = parseInt(process.env.PORT || '3009');
  await app.listen({ port, host: '0.0.0.0' });

  console.log(`\n🎨 Thumbnail Engine  →  http://localhost:${port}`);
  console.log(`   POST /thumbnails/generate     — генерация обложки`);
  console.log(`   POST /thumbnails/ab-test      — A/B тест 3 вариантов`);
  console.log(`   GET  /thumbnails/ab-tests     — список тестов`);
  console.log(`   POST /thumbnails/ab-tests/:id/winner — выбрать победителя`);
  console.log(`   GET  /health\n`);
}

const shutdown = async () => {
  await app.close();
  await disconnectPrisma();
  process.exit(0);
};
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
