import { FastifyInstance } from 'fastify'
import { LocalizationService } from '../services/localization.service'

const service = new LocalizationService()

export async function localizationRoutes(fastify: FastifyInstance) {
  // POST /tasks — create new localization task
  fastify.post('/tasks', async (req, reply) => {
    const body = req.body as {
      youtubeVideoId: string
      title: string
      sourceLang?: string
      targetLangs: string[]
      mode?: 'SUBTITLES' | 'DUBBING' | 'BOTH'
      scriptText?: string
      durationSeconds?: number
    }

    if (!body.youtubeVideoId || !body.title || !body.targetLangs?.length) {
      return reply.status(400).send({ error: 'youtubeVideoId, title, and targetLangs are required' })
    }

    const task = await service.createTask(body)
    return reply.status(201).send(task)
  })

  // GET /tasks — list with pagination + optional status filter
  fastify.get('/tasks', async (req, reply) => {
    const q = req.query as Record<string, string>
    const result = await service.listTasks(
      q.page ? parseInt(q.page) : 1,
      q.limit ? parseInt(q.limit) : 20,
      q.status,
    )
    return reply.send(result)
  })

  // GET /tasks/:id — get task with all assets
  fastify.get('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await service.getTask(id)
    return reply.send(task)
  })

  // POST /tasks/:id/process — start Stage 1 or Stage 2
  fastify.post('/tasks/:id/process', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { stage = 1 } = (req.body as { stage?: number }) || {}

    // Run async — don't block response
    const runStage = stage === 2 ? service.processStage2(id) : service.processStage1(id)
    runStage.catch((err) => fastify.log.error(`Stage ${stage} failed for task ${id}:`, err))

    return reply.send({ taskId: id, stage, status: 'processing_started' })
  })

  // GET /tasks/:id/package — get download package with all assets
  fastify.get('/tasks/:id/package', async (req, reply) => {
    const { id } = req.params as { id: string }
    const pkg = await service.getPackage(id)
    return reply.send(pkg)
  })

  // GET /stats
  fastify.get('/stats', async (_req, reply) => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const [total, byStatus, byMode] = await Promise.all([
      prisma.localizationTask.count(),
      prisma.localizationTask.groupBy({ by: ['status'], _count: true }),
      prisma.localizationTask.groupBy({ by: ['mode'], _count: true }),
    ])
    await prisma.$disconnect()
    return reply.send({ total, byStatus, byMode })
  })
}
