import { FastifyInstance } from 'fastify';
import { getPrisma } from '../services/prisma';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', service: 'thumbnail-engine', port: 3009 });
    } catch {
      return reply.status(503).send({ status: 'error', service: 'thumbnail-engine', port: 3009 });
    }
  });

  app.get('/thumbnails/stats', async (_req, reply) => {
    const prisma = getPrisma();
    const [total, done, failed, byProvider, costs] = await Promise.all([
      prisma.thumbnailJob.count(),
      prisma.thumbnailJob.count({ where: { status: 'DONE' } }),
      prisma.thumbnailJob.count({ where: { status: 'FAILED' } }),
      prisma.thumbnailJob.groupBy({ by: ['provider'], _count: { id: true } }),
      prisma.thumbnailCostLog.aggregate({ _sum: { costUsd: true }, _count: { id: true } }),
    ]);
    return reply.send({
      total, done, failed,
      successRate: total > 0 ? ((done / total) * 100).toFixed(1) + '%' : '0%',
      byProvider,
      totalCostUsd: Number(costs._sum.costUsd ?? 0).toFixed(6),
      totalApiCalls: costs._count.id,
    });
  });
}
