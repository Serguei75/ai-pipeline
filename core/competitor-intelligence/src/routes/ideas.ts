import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import type { EventPublisher } from '../services/events'

export async function ideasRoutes(app: FastifyInstance, opts: { events: EventPublisher }) {
  const { events } = opts

  // GET /competitors/ideas
  app.get<{
    Querystring: { status?: string; priority?: string; hookType?: string; limit?: string; page?: string }
  }>('/', async (req) => {
    const { status, priority, hookType, limit = '20', page = '1' } = req.query
    const take = Math.min(parseInt(limit), 100)
    const skip = (parseInt(page) - 1) * take

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (hookType) where.hookType = hookType

    const [total, data] = await Promise.all([
      prisma.competitorIdea.count({ where }),
      prisma.competitorIdea.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take,
        skip,
        include: {
          sourceVideo: {
            select: {
              title: true,
              videoId: true,
              viewVelocity: true,
              viewCount: true,
              channel: { select: { name: true, niche: true } },
            },
          },
        },
      }),
    ])

    return { total, page: parseInt(page), limit: take, data }
  })

  // POST /competitors/ideas/:id/export — экспорт в Topic Engine
  app.post<{ Params: { id: string } }>('/:id/export', async (req, reply) => {
    const idea = await prisma.competitorIdea.findUnique({
      where: { id: req.params.id },
      include: { sourceVideo: { include: { channel: true } } },
    })
    if (!idea) return reply.status(404).send({ error: 'Idea not found' })
    if (idea.status === 'EXPORTED') return reply.status(409).send({ error: 'Already exported' })
    if (idea.status === 'REJECTED') return reply.status(409).send({ error: 'Idea is rejected' })

    // Отправляем в Event Bus → Topic Engine подхватит и создаст тему
    await events.publish('competitor.idea_exported', {
      ideaId: idea.id,
      title: idea.title,
      angle: idea.angle,
      hookType: idea.hookType,
      estimatedCpm: idea.estimatedCpm,
      priority: idea.priority,
      sourceChannel: idea.sourceVideo.channel.name,
      sourceVideoTitle: idea.sourceVideo.title,
      sourceVideoId: idea.sourceVideo.videoId,
    })

    await prisma.competitorIdea.update({
      where: { id: req.params.id },
      data: { status: 'EXPORTED' },
    })

    return { success: true, message: 'Exported to Topic Engine via Event Bus' }
  })

  // DELETE /competitors/ideas/:id — отклонить
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const updated = await prisma.competitorIdea
      .update({ where: { id: req.params.id }, data: { status: 'REJECTED' } })
      .catch(() => null)
    if (!updated) return reply.status(404).send({ error: 'Idea not found' })
    return reply.status(204).send()
  })

  // POST /competitors/ideas/:id/restore — вернуть в PENDING
  app.post<{ Params: { id: string } }>('/:id/restore', async (req, reply) => {
    const updated = await prisma.competitorIdea
      .update({ where: { id: req.params.id }, data: { status: 'PENDING' } })
      .catch(() => null)
    if (!updated) return reply.status(404).send({ error: 'Idea not found' })
    return updated
  })
}
