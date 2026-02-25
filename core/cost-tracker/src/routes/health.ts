import { FastifyInstance } from 'fastify';
import { getPrisma } from '../services/prisma';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', service: 'cost-tracker', port: 3010 });
    } catch {
      return reply.status(503).send({ status: 'error', service: 'cost-tracker', port: 3010 });
    }
  });
}
