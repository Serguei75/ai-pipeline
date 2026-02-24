import type { FastifyInstance } from 'fastify'
import { db } from '../db'

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/health', async (_req, reply) => {
    try {
      await db.$queryRaw`SELECT 1`
      return reply.send({
        status:  'ok',
        service: 'script-engine',
        db:      'connected',
        ts:      new Date().toISOString(),
      })
    } catch {
      return reply.status(503).send({
        status:  'error',
        service: 'script-engine',
        db:      'disconnected',
      })
    }
  })
}
