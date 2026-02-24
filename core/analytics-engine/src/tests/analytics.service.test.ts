import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsService } from '../services/analytics.service.js'
import { ChannelType, Niche } from '../types.js'

const mockDb = {
  videoMetric: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  channelSnapshot: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  syncJob: {
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  nicheBenchmark: { findMany: vi.fn(), findFirst: vi.fn() },
}

const mockYouTube = {
  getVideoStats: vi.fn(),
  getVideoAnalytics: vi.fn(),
  getChannelStats: vi.fn(),
  getChannelVideos: vi.fn(),
}

const mockReport = {
  buildHookPerformanceReport: vi.fn(),
  buildNicheReport: vi.fn(),
  buildChannelDashboard: vi.fn(),
  estimateRevenue: vi.fn(),
}

describe('AnalyticsService', () => {
  let service: AnalyticsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AnalyticsService(mockDb as any, mockYouTube as any, mockReport as any)
  })

  describe('registerVideo()', () => {
    it('fetches stats from YouTube and creates metric record', async () => {
      mockDb.videoMetric.findUnique.mockResolvedValue(null)
      mockYouTube.getVideoStats.mockResolvedValue({
        videoId: 'abc123',
        title: 'AI is replacing financial advisors',
        publishedAt: '2026-02-01T12:00:00Z',
        viewCount: 1500,
        likeCount: 120,
        commentCount: 45,
      })
      mockDb.videoMetric.create.mockResolvedValue({ id: 'metric-1' })

      await service.registerVideo({
        scriptId: 'script-uuid-1',
        youtubeVideoId: 'abc123',
        channelId: 'UC_channel_id',
        channelType: ChannelType.INTELLECTUAL,
        niche: Niche.FINANCE,
        hookEmotionType: 'FEAR',
        hookScore: 92,
      })

      expect(mockYouTube.getVideoStats).toHaveBeenCalledWith('abc123')
      expect(mockDb.videoMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            youtubeVideoId: 'abc123',
            hookEmotionType: 'FEAR',
            hookScore: 92,
          }),
        })
      )
    })

    it('throws Conflict if video already registered', async () => {
      mockDb.videoMetric.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        service.registerVideo({
          scriptId: 'script-uuid-1',
          youtubeVideoId: 'abc123',
          channelId: 'UC_id',
          channelType: ChannelType.INTELLECTUAL,
          niche: Niche.FINANCE,
        })
      ).rejects.toThrow('already registered')
    })
  })

  describe('syncVideoMetrics()', () => {
    it('updates both basic stats and analytics data', async () => {
      mockDb.videoMetric.findUniqueOrThrow.mockResolvedValue({
        youtubeVideoId: 'abc123',
        publishedAt: new Date('2026-02-01'),
      })
      mockYouTube.getVideoStats.mockResolvedValue({
        videoId: 'abc123', title: 'Test', publishedAt: '2026-02-01',
        viewCount: 25000, likeCount: 500, commentCount: 80,
      })
      mockYouTube.getVideoAnalytics.mockResolvedValue({
        views: 25000, estimatedRevenue: 45.20, estimatedCpm: 28.50,
        estimatedRpm: 15.67, adImpressions: 18000,
        watchTimeMinutes: 125000, avgViewDurationSec: 300,
        avgViewPercentage: 43, subscribersGained: 85,
        impressions: 120000, clickThroughRate: 4.8,
      })
      mockDb.videoMetric.update.mockResolvedValue({ id: 'metric-1', views: 25000, cpm: 28.50 })

      const result = await service.syncVideoMetrics('abc123')

      expect(mockDb.videoMetric.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            views: 25000,
            cpm: 28.50,
            estimatedRevenue: 45.20,
          }),
        })
      )
    })

    it('updates only basic stats when Analytics API returns null', async () => {
      mockDb.videoMetric.findUniqueOrThrow.mockResolvedValue({
        youtubeVideoId: 'abc123',
        publishedAt: new Date('2026-02-01'),
      })
      mockYouTube.getVideoStats.mockResolvedValue({
        videoId: 'abc123', title: 'Test', publishedAt: '2026-02-01',
        viewCount: 5000, likeCount: 100, commentCount: 20,
      })
      mockYouTube.getVideoAnalytics.mockResolvedValue(null) // no OAuth token
      mockDb.videoMetric.update.mockResolvedValue({ id: 'metric-1', views: 5000, cpm: null })

      await service.syncVideoMetrics('abc123')

      expect(mockDb.videoMetric.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ views: 5000 }),
        })
      )
      // Should NOT include cpm or revenue in the update when analytics is null
      const callData = mockDb.videoMetric.update.mock.calls[0][0].data
      expect(callData).not.toHaveProperty('cpm')
    })
  })
})
