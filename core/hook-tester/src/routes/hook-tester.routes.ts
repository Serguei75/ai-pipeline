import { FastifyInstance } from 'fastify'
import { HookTesterService } from '../services/hook-tester.service'

const service = new HookTesterService()

export async function hookTesterRoutes(fastify: FastifyInstance) {
  // POST /tests — create test + generate 3 hook variants
  fastify.post('/tests', async (req, reply) => {
    const body = req.body as {
      scriptId: string
      topicTitle: string
      channelType: 'FUEL' | 'INTELLECTUAL'
      niche?: string
      triggersOverride?: string[]
    }
    if (!body.scriptId || !body.topicTitle || !body.channelType) {
      return reply.status(400).send({ error: 'scriptId, topicTitle, channelType required' })
    }
    const test = await service.createTest(body as Parameters<typeof service.createTest>[0])
    return reply.status(201).send(test)
  })

  // GET /tests — list with optional status filter
  fastify.get('/tests', async (req, reply) => {
    const q = req.query as Record<string, string>
    const result = await service.listTests(
      q.page ? parseInt(q.page) : 1,
      q.limit ? parseInt(q.limit) : 20,
      q.status,
    )
    return reply.send(result)
  })

  // GET /tests/:id
  fastify.get('/tests/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const test = await service.getTest(id)
    return reply.send(test)
  })

  // PUT /tests/:id/variants/:variantId/performance — update analytics data
  fastify.put('/tests/:id/variants/:variantId/performance', async (req, reply) => {
    const { id, variantId } = req.params as { id: string; variantId: string }
    const data = req.body as Parameters<typeof service.updateVariantPerformance>[2]
    const updated = await service.updateVariantPerformance(id, variantId, data)
    return reply.send(updated)
  })

  // POST /tests/:id/conclude — manually conclude a test
  fastify.post('/tests/:id/conclude', async (req, reply) => {
    const { id } = req.params as { id: string }
    const test = await service.concludeTest(id)
    return reply.send(test)
  })

  // GET /templates — best performing hooks (template library)
  fastify.get('/templates', async (req, reply) => {
    const q = req.query as Record<string, string>
    const templates = await service.getTemplates(
      q.channelType as 'FUEL' | 'INTELLECTUAL' | undefined,
      q.niche,
    )
    return reply.send({ templates })
  })

  // GET /stats
  fastify.get('/stats', async (_req, reply) => {
    return reply.send(await service.getStats())
  })
}
