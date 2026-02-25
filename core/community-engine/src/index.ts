import Fastify from 'fastify';
import cors from '@fastify/cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { commentRoutes } from './routes/comments.routes';
import { CommentService } from './services/comment.service';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3006', 10);
const HOST = '0.0.0.0';

const fastify = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
});

fastify.register(cors, { origin: true });
fastify.register(commentRoutes);

// Health check
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'community-engine',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// Scheduled comment classification
const cronSchedule = process.env.COMMENT_SYNC_CRON || '*/30 * * * *';
cron.schedule(cronSchedule, async () => {
  const service = new CommentService();
  fastify.log.info('Running scheduled comment classification...');
  try {
    const processed = await service.classifyPendingComments(50);
    fastify.log.info(`Scheduled run: processed ${processed} comments`);
  } catch (err) {
    fastify.log.error('Cron error:', err);
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`🤖 Community Engine running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
