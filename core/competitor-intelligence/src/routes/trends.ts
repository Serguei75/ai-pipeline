import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import type { AnalyzerService } from '../services/analyzer'
import type { EventPublisher } from '../services/events'

interface Opts {
  analyzer: AnalyzerService
  events: EventPublisher
}

export async function trendsRoutes(app: FastifyInstance, opts: Opts) {
  const { analyzer, events } = opts

  // GET /competitors/trends?days=7&limit=20
  app.get<{ Querystring: { days?: string; limit?: string; niche?: string } }>('/', async (req) => {
    const days = parseInt(req.query.days ?? '7')
    const limit = Math.min(parseInt(req.query.limit ?? '20'), 100)
    const since = new Date(Date.now() - days * 86_400_000)

    const where: Record<string, unknown> = {
      publishedAt: { gte: since },
      viewVelocity: { gte: 100 },
    }
    if (req.query.niche) {
      where.channel = { niche: req.query.niche }
    }

    const trending = await prisma.competitorVideo.findMany({
      where,
      orderBy: { viewVelocity: 'desc' },
      take: limit,
      include: { channel: { select: { name: true, channelId: true, niche: true } } },
    })

    // Группировка по нишам
    const byNiche: Record<string, typeof trending> = {}
    for (const v of trending) {
      const niche = v.channel?.niche ?? 'uncategorized'
      ;(byNiche[niche] ??= []).push(v)
    }

    return {
      period: `${days} days`,
      total: trending.length,
      byNiche,
      topVideos: trending.slice(0, 10),
    }
  })

  // POST /competitors/trends/analyze
  // AI анализ + генерация идей по каналу
  app.post<{ Body: { channelId: string } }>('/analyze', async (req, reply) => {
    const { channelId } = req.body
    if (!channelId) return reply.status(400).send({ error: 'channelId is required' })

    const channel = await prisma.competitorChannel.findUnique({
      where: { id: channelId },
      include: { videos: { orderBy: { viewVelocity: 'desc' }, take: 30 } },
    })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!channel.videos.length)
      return reply.status(400).send({ error: 'No videos synced. Run POST /competitors/channels/:id/sync first.' })

    try {
      const result = await analyzer.analyzeAndGenerateIdeas(
        channel.videos.map(v => ({
          title: v.title,
          viewVelocity: v.viewVelocity,
          viewCount: v.viewCount,
          tags: v.tags,
        })),
        channel.name,
      )

      // Сохраняем идеи в БД
      const savedIdeas = []
      const sourceVideo = channel.videos[0] // самое вирусное видео канала

      for (const idea of result.ideas ?? []) {
        const saved = await prisma.competitorIdea.create({
          data: {
            sourceVideoId: sourceVideo.id,
            title: idea.title,
            angle: idea.angle,
            hookType: idea.hookType ?? 'curiosity',
            estimatedCpm: idea.estimatedCpm ?? null,
            priority: idea.priority ?? 'MEDIUM',
          },
        })
        savedIdeas.push(saved)
      }

      // Помечаем видео как проанализированные
      await prisma.competitorVideo.updateMany({
        where: { channelId },
        data: { isAnalyzed: true },
      })

      // Публикуем событие
      await events.publish('competitor.ideas_bulk_generated', {
        channelId,
        channelName: channel.name,
        ideasCount: savedIdeas.length,
        trends: result.trends ?? [],
      })

      return {
        channelId,
        channelName: channel.name,
        trends: result.trends ?? [],
        ideasGenerated: savedIdeas.length,
        ideas: savedIdeas,
      }
    } catch (e) {
      return reply.status(500).send({ error: 'AI analysis failed: ' + (e as Error).message })
    }
  })
}
