import type { PrismaClient } from '@prisma/client'
import type { YouTubeService } from './youtube.service.js'
import type { ReportService } from './report.service.js'
import {
  type RegisterVideoDTO,
  type SyncChannelDTO,
  type ChannelDashboard,
  type HookPerformanceData,
  type NichePerformanceData,
  type RevenueEstimate,
  Niche,
} from '../types.js'
import { logger } from '../logger.js'

export class AnalyticsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly youtube: YouTubeService,
    private readonly report: ReportService,
  ) {}

  // ── Register video ─────────────────────────────────────────────────────

  async registerVideo(dto: RegisterVideoDTO) {
    const existing = await this.db.videoMetric.findUnique({ where: { youtubeVideoId: dto.youtubeVideoId } })
    if (existing) {
      throw new Error(`Video ${dto.youtubeVideoId} is already registered`)
    }

    const stats = await this.youtube.getVideoStats(dto.youtubeVideoId)

    const metric = await this.db.videoMetric.create({
      data: {
        scriptId: dto.scriptId,
        youtubeVideoId: dto.youtubeVideoId,
        channelId: dto.channelId,
        channelType: dto.channelType,
        niche: dto.niche,
        title: stats.title,
        publishedAt: new Date(stats.publishedAt),
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
        hookEmotionType: dto.hookEmotionType,
        hookScore: dto.hookScore,
        lastSyncAt: new Date(),
      },
    })

    logger.info({ youtubeVideoId: dto.youtubeVideoId, title: stats.title }, 'Video registered')
    return metric
  }

  // ── Sync single video ───────────────────────────────────────────────────

  async syncVideoMetrics(youtubeVideoId: string) {
    const metric = await this.db.videoMetric.findUniqueOrThrow({ where: { youtubeVideoId } })

    const stats = await this.youtube.getVideoStats(youtubeVideoId)

    const startDate = metric.publishedAt.toISOString().split('T')[0]!
    const endDate = new Date().toISOString().split('T')[0]!
    const analytics = await this.youtube.getVideoAnalytics(youtubeVideoId, startDate, endDate)

    const updated = await this.db.videoMetric.update({
      where: { youtubeVideoId },
      data: {
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
        ...(analytics !== null && {
          estimatedRevenue: analytics.estimatedRevenue,
          cpm: analytics.estimatedCpm,
          rpm: analytics.estimatedRpm,
          adImpressions: analytics.adImpressions,
          watchTimeHours: analytics.watchTimeMinutes / 60,
          avgViewDurationSec: analytics.avgViewDurationSec,
          avgViewPercentage: analytics.avgViewPercentage,
          subscribersGained: analytics.subscribersGained,
          impressions: analytics.impressions,
          clickThroughRate: analytics.clickThroughRate,
        }),
        lastSyncAt: new Date(),
      },
    })

    logger.info({ youtubeVideoId, views: stats.viewCount, cpm: analytics?.estimatedCpm }, 'Video metrics synced')
    return updated
  }

  // ── Sync all videos for a channel ─────────────────────────────────────

  async syncChannel(dto: SyncChannelDTO) {
    const syncJob = await this.db.syncJob.create({
      data: {
        channelId: dto.channelId,
        type: 'FULL_CHANNEL',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    logger.info({ channelId: dto.channelId }, 'Starting full channel sync')

    try {
      const videoIds = await this.youtube.getChannelVideos(dto.channelId)
      let processed = 0

      for (const videoId of videoIds) {
        const registered = await this.db.videoMetric.findUnique({ where: { youtubeVideoId: videoId } })
        if (registered) {
          await this.syncVideoMetrics(videoId).catch((err) => {
            logger.warn({ videoId, error: err.message }, 'Sync failed for video, continuing')
          })
          processed++
        }
      }

      // Take daily channel snapshot
      const channelStats = await this.youtube.getChannelStats(dto.channelId)
      await this.db.channelSnapshot.create({
        data: {
          channelId: dto.channelId,
          channelType: dto.channelType,
          subscriberCount: channelStats.subscriberCount,
          totalViews: channelStats.viewCount,
          totalVideos: channelStats.videoCount,
          snapshotDate: new Date(),
        },
      })

      await this.db.syncJob.update({
        where: { id: syncJob.id },
        data: { status: 'COMPLETED', videosProcessed: processed, completedAt: new Date() },
      })

      logger.info({ channelId: dto.channelId, processed }, 'Channel sync completed')
      return this.db.syncJob.findUniqueOrThrow({ where: { id: syncJob.id } })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.db.syncJob.update({
        where: { id: syncJob.id },
        data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
      })
      throw error
    }
  }

  // ── Reports ──────────────────────────────────────────────────────────────────

  async getChannelDashboard(channelType: string): Promise<ChannelDashboard> {
    const metrics = await this.db.videoMetric.findMany({
      where: { channelType: channelType as any },
      orderBy: { views: 'desc' },
    })

    const lastSnapshot = await this.db.channelSnapshot.findFirst({
      where: { channelType: channelType as any },
      orderBy: { snapshotDate: 'desc' },
    })

    const benchmarks = await this.db.nicheBenchmark.findMany()

    return this.report.buildChannelDashboard(channelType, metrics as any, lastSnapshot, benchmarks as any)
  }

  async getHookPerformanceReport(): Promise<HookPerformanceData[]> {
    const metrics = await this.db.videoMetric.findMany({
      where: { hookEmotionType: { not: null } },
    })
    return this.report.buildHookPerformanceReport(metrics as any)
  }

  async getNicheReport(niche?: string): Promise<NichePerformanceData[]> {
    const metrics = await this.db.videoMetric.findMany({
      where: niche ? { niche: niche as any } : undefined,
    })
    const benchmarks = await this.db.nicheBenchmark.findMany()
    return this.report.buildNicheReport(metrics as any, benchmarks as any)
  }

  async getEstimateRevenue(
    niche: string,
    markets: string[],
    targetViews: number,
  ): Promise<RevenueEstimate> {
    const benchmark = await this.db.nicheBenchmark.findFirst({
      where: { niche: niche as any, market: 'US' },
    })
    return this.report.estimateRevenue(niche, markets, targetViews, benchmark as any)
  }

  async listVideos(filters: {
    channelType?: string
    niche?: string
    limit?: number
    offset?: number
  }) {
    return this.db.videoMetric.findMany({
      where: {
        ...(filters.channelType && { channelType: filters.channelType as any }),
        ...(filters.niche && { niche: filters.niche as any }),
      },
      orderBy: { views: 'desc' },
      skip: filters.offset ?? 0,
      take: filters.limit ?? 50,
    })
  }

  async getVideoByScript(scriptId: string) {
    return this.db.videoMetric.findFirst({ where: { scriptId } })
  }
}
