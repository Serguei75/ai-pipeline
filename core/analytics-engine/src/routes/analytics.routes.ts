import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { AnalyticsService } from '../services/analytics.service.js'
import { ChannelType, Niche } from '../types.js'

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const RegisterVideoSchema = z.object({
  scriptId: z.string().uuid(),
  youtubeVideoId: z.string().min(5).max(20),
  channelId: z.string().min(5),
  channelType: z.nativeEnum(ChannelType),
  niche: z.nativeEnum(Niche),
  hookEmotionType: z.enum(['FEAR', 'CURIOSITY', 'SURPRISE', 'DESIRE', 'URGENCY']).optional(),
  hookScore: z.number().min(0).max(100).optional(),
})

const SyncChannelSchema = z.object({
  channelId: z.string().min(5),
  channelType: z.nativeEnum(ChannelType),
})

const EstimateSchema = z.object({
  niche: z.nativeEnum(Niche),
  markets: z.array(z.string().length(2)).min(1),
  targetViews: z.coerce.number().min(100),
})

const ListQuerySchema = z.object({
  channelType: z.nativeEnum(ChannelType).optional(),
  niche: z.nativeEnum(Niche).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ─── Routes ─────────────────────────────────────────────────────────────────

export const analyticsRoutes: FastifyPluginAsync<{ analyticsService: AnalyticsService }> = async (fastify, opts) => {
  const { analyticsService } = opts

  // --- Video Metrics ---

  // POST /api/analytics/videos
  // Register a published YouTube video — links scriptId to youtubeVideoId
  fastify.post('/api/analytics/videos', async (request, reply) => {
    const body = RegisterVideoSchema.parse(request.body)
    const metric = await analyticsService.registerVideo(body)
    return reply.status(201).send(metric)
  })

  // GET /api/analytics/videos
  fastify.get('/api/analytics/videos', async (request, reply) => {
    const query = ListQuerySchema.parse(request.query)
    const videos = await analyticsService.listVideos(query)
    return reply.send({ data: videos, count: videos.length })
  })

  // GET /api/analytics/videos/:youtubeVideoId
  fastify.get('/api/analytics/videos/:youtubeVideoId', async (request, reply) => {
    const { youtubeVideoId } = request.params as { youtubeVideoId: string }
    const metric = await analyticsService.syncVideoMetrics(youtubeVideoId)
    return reply.send(metric)
  })

  // POST /api/analytics/videos/:youtubeVideoId/sync
  // Pull latest metrics from YouTube API
  fastify.post('/api/analytics/videos/:youtubeVideoId/sync', async (request, reply) => {
    const { youtubeVideoId } = request.params as { youtubeVideoId: string }
    const metric = await analyticsService.syncVideoMetrics(youtubeVideoId)
    return reply.send(metric)
  })

  // GET /api/analytics/scripts/:scriptId/performance
  // Get metrics by scriptId (reverse lookup)
  fastify.get('/api/analytics/scripts/:scriptId/performance', async (request, reply) => {
    const { scriptId } = request.params as { scriptId: string }
    const metric = await analyticsService.getVideoByScript(scriptId)
    if (!metric) return reply.status(404).send({ error: 'No video found for this script' })
    return reply.send(metric)
  })

  // --- Channel Sync ---

  // POST /api/analytics/channels/sync
  fastify.post('/api/analytics/channels/sync', async (request, reply) => {
    const body = SyncChannelSchema.parse(request.body)
    const syncJob = await analyticsService.syncChannel(body)
    return reply.send(syncJob)
  })

  // --- Reports & Dashboard ---

  // GET /api/analytics/channels/dashboard?channelType=INTELLECTUAL
  // Full ROI dashboard: views, revenue, CPM, CTV%, hook performance, niche breakdown
  fastify.get('/api/analytics/channels/dashboard', async (request, reply) => {
    const { channelType } = request.query as { channelType: string }
    if (!channelType) return reply.status(400).send({ error: 'channelType is required' })
    const dashboard = await analyticsService.getChannelDashboard(channelType)
    return reply.send(dashboard)
  })

  // GET /api/analytics/reports/hooks
  // Hook emotion type performance — which trigger (FEAR/CURIOSITY/etc.) drives
  // highest retention@8sec and CTR → feeds back into Script Engine prompt selection
  fastify.get('/api/analytics/reports/hooks', async (_request, reply) => {
    const report = await analyticsService.getHookPerformanceReport()
    return reply.send({ data: report, generatedAt: new Date().toISOString() })
  })

  // GET /api/analytics/reports/niches?niche=FINANCE
  // CPM performance vs benchmark per niche
  fastify.get('/api/analytics/reports/niches', async (request, reply) => {
    const { niche } = request.query as { niche?: string }
    const report = await analyticsService.getNicheReport(niche)
    return reply.send({ data: report, generatedAt: new Date().toISOString() })
  })

  // GET /api/analytics/reports/estimate?niche=FINANCE&markets=US,AU&targetViews=50000
  // Estimate revenue BEFORE publishing — based on niche benchmarks
  fastify.get('/api/analytics/reports/estimate', async (request, reply) => {
    const query = EstimateSchema.parse(request.query)
    const estimate = await analyticsService.getEstimateRevenue(
      query.niche,
      query.markets,
      query.targetViews,
    )
    return reply.send(estimate)
  })
}
