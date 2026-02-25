import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function videosRoutes(app: FastifyInstance) {
  // GET /competitors/videos
  app.get<{
    Querystring: {
      channelId?: string
      trending?: string
      analyzed?: string
      limit?: string
      page?: string
    }
  }>('/', async (req) => {
    const { channelId, trending, analyzed, limit = '20', page = '1' } = req.query
    const take = Math.min(parseInt(limit), 100)
    const skip = (parseInt(page) - 1) * take

    const where: Record<string, unknown> = {}
    if (channelId) where.channelId = channelId
    if (analyzed !== undefined) where.isAnalyzed = analyzed === 'true'
    if (trending === 'true') where.viewVelocity = { gte: 500 }

    const [total, data] = await Promise.all([
      prisma.competitorVideo.count({ where }),
      prisma.competitorVideo.findMany({
        where,
        orderBy: { viewVelocity: 'desc' },
        take,
        skip,
        include: { channel: { select: { name: true, niche: true, channelId: true } } },
      }),
    ])

    return { total, page: parseInt(page), limit: take, data }
  })

  // GET /competitors/videos/:videoId
  app.get<{ Params: { videoId: string } }>('/:videoId', async (req, reply) => {
    const video = await prisma.competitorVideo.findFirst({
      where: { videoId: req.params.videoId },
      include: { channel: true, ideas: { orderBy: { createdAt: 'desc' } } },
    })
    if (!video) return reply.status(404).send({ error: 'Video not found' })
    return video
  })
}
