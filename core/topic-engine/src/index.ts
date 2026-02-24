// core/topic-engine/src/index.ts

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { topicRoutes } from './routes/topics.routes';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Decorate with Prisma
fastify.decorate('prisma', prisma);

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    });

    // Health check
    fastify.get('/health', async () => ({
      status: 'ok',
      service: 'topic-engine',
      timestamp: new Date().toISOString(),
    }));

    // Register routes
    await fastify.register(topicRoutes);

    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    fastify.log.info(`\ud83d\ude80 Topic Engine running on http://${host}:${port}`);
    fastify.log.info(`\ud83c\udfe5 Health: http://${host}:${port}/health`);
    fastify.log.info(`\ud83d\udcda API:    http://${host}:${port}/api/topics`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

const shutdown = async () => {
  fastify.log.info('Shutting down...');
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
