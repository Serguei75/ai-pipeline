import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import type { YouTubeService } from '../services/youtube'
import type { SyncService } from '../services/sync'

interface Opts {
  youtube: YouTubeService
  sync: SyncService
}

export async function channelsRoutes(app: FastifyInstance, opts: Opts) {
  const { youtube, sync } = opts

  // GET /competitors/channels
  app.get('/', async () =>
    prisma.competitorChannel.findMany({
      orderBy: { lastSyncAt: 'desc' },
      include: { _count: { select: { videos: true } } },
    }),
  )

  // GET /competitors/channels/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const ch = await prisma.competitorChannel.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { videos: true } },
        videos: { orderBy: { viewVelocity: 'desc' }, take: 10 },
      },
    })
    if (!ch) return reply.status(404).send({ error: 'Channel not found' })
    return ch
  })

  // POST /competitors/channels
  app.post<{ Body: { channelUrl: string; niche?: string } }>('/', async (req, reply) => {
    const { channelUrl, niche } = req.body
    if (!channelUrl) return reply.status(400).send({ error: 'channelUrl is required' })

    const resolved = youtube.resolveChannelId(channelUrl)
    let info: any = null

    try {
      info = resolved.type === 'id'
        ? await youtube.getChannelById(resolved.value)
        : await youtube.resolveChannelByHandle(resolved.value)
    } catch (e) {
      return reply.status(502).send({ error: 'YouTube API error: ' + (e as Error).message })
    }

    if (!info) return reply.status(404).send({ error: 'YouTube channel not found' })

    const existing = await prisma.competitorChannel.findUnique({ where: { channelId: info.id } })
    if (existing) return reply.status(409).send({ error: 'Channel already tracked', channel: existing })

    const channel = await prisma.competitorChannel.create({
      data: {
        channelId: info.id!,
        channelUrl,
        name: info.snippet?.title ?? channelUrl,
        description: info.snippet?.description ?? null,
        subscriberCount: parseInt(info.statistics?.subscriberCount ?? '0'),
        videoCount: parseInt(info.statistics?.videoCount ?? '0'),
        niche: niche ?? null,
      },
    })

    // Асинх первичная синхронизация
    void sync.syncChannel(channel.id).catch(e => app.log.warn('Initial sync failed:', e))

    return reply.status(201).send(channel)
  })

  // PATCH /competitors/channels/:id
  app.patch<{ Params: { id: string }; Body: { niche?: string; isActive?: boolean } }>(
    '/:id', async (req, reply) => {
      const updated = await prisma.competitorChannel.update({
        where: { id: req.params.id },
        data: req.body,
      }).catch(() => null)
      if (!updated) return reply.status(404).send({ error: 'Not found' })
      return updated
    },
  )

  // DELETE /competitors/channels/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await prisma.competitorChannel.delete({ where: { id: req.params.id } }).catch(() => null)
    return reply.status(204).send()
  })

  // POST /competitors/channels/:id/sync
  app.post<{ Params: { id: string } }>('/:id/sync', async (req, reply) => {
    try {
      const result = await sync.syncChannel(req.params.id)
      return { success: true, channelId: req.params.id, ...result }
    } catch (e) {
      return reply.status(500).send({ error: (e as Error).message })
    }
  })

  // POST /competitors/channels/sync-all
  app.post('/sync-all', async () => {
    void sync.syncAll()
    return { success: true, message: 'Sync started in background' }
  })
}
