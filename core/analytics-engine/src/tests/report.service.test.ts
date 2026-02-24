import { describe, it, expect } from 'vitest'
import { ReportService } from '../services/report.service.js'

const report = new ReportService()

const MOCK_BENCHMARKS = [
  { niche: 'FINANCE', market: 'US', cpmMin: 15, cpmMax: 50, cpmAvg: 32.50 },
  { niche: 'TECH', market: 'US', cpmMin: 8, cpmMax: 12, cpmAvg: 10.00 },
]

const MOCK_METRICS = [
  {
    youtubeVideoId: 'abc123',
    title: 'AI replacing financial advisors',
    views: 120000,
    estimatedRevenue: 210.50,
    cpm: 28.50,
    avgViewPercentage: 44,
    clickThroughRate: 5.2,
    hookEmotionType: 'FEAR',
    retentionAt8Sec: 82,
    retentionAt30Sec: 65,
    deviceTV: 48,
    niche: 'FINANCE',
    publishedAt: new Date('2026-02-01'),
  },
  {
    youtubeVideoId: 'def456',
    title: 'This passive income secret nobody tells you',
    views: 85000,
    estimatedRevenue: 140.00,
    cpm: 24.50,
    avgViewPercentage: 40,
    clickThroughRate: 4.8,
    hookEmotionType: 'CURIOSITY',
    retentionAt8Sec: 76,
    retentionAt30Sec: 58,
    deviceTV: 45,
    niche: 'FINANCE',
    publishedAt: new Date('2026-02-10'),
  },
  {
    youtubeVideoId: 'ghi789',
    title: 'AI tool that replaced my $5k/mo SaaS',
    views: 42000,
    estimatedRevenue: 88.00,
    cpm: 18.50,
    avgViewPercentage: 47,
    clickThroughRate: 4.1,
    hookEmotionType: 'SURPRISE',
    retentionAt8Sec: 79,
    retentionAt30Sec: 61,
    deviceTV: 41,
    niche: 'SAAS',
    publishedAt: new Date('2026-02-15'),
  },
]

describe('ReportService', () => {
  describe('buildHookPerformanceReport()', () => {
    it('groups by emotion type and sorts by retention@8sec descending', () => {
      const result = report.buildHookPerformanceReport(MOCK_METRICS as any)

      expect(result.length).toBe(3) // FEAR, CURIOSITY, SURPRISE
      // FEAR should be first (retentionAt8Sec: 82)
      expect(result[0].emotionType).toBe('FEAR')
      expect(result[0].avgRetentionAt8Sec).toBe(82)
      expect(result[0].videoCount).toBe(1)
      expect(result[0].topVideo?.youtubeVideoId).toBe('abc123')
    })

    it('returns null averages when all metrics have null values', () => {
      const metrics = [{
        ...MOCK_METRICS[0],
        cpm: null,
        estimatedRevenue: null,
        retentionAt8Sec: null,
        hookEmotionType: 'URGENCY',
      }]
      const result = report.buildHookPerformanceReport(metrics as any)
      expect(result[0].avgCpm).toBeNull()
      expect(result[0].avgRetentionAt8Sec).toBeNull()
    })

    it('excludes metrics with null hookEmotionType', () => {
      const mixed = [
        ...MOCK_METRICS,
        { ...MOCK_METRICS[0], youtubeVideoId: 'no-hook', hookEmotionType: null },
      ]
      const result = report.buildHookPerformanceReport(mixed as any)
      const noHook = result.find((r) => r.emotionType === null)
      expect(noHook).toBeUndefined()
    })
  })

  describe('buildNicheReport()', () => {
    it('groups by niche, calculates totals, compares to benchmark', () => {
      const result = report.buildNicheReport(MOCK_METRICS as any, MOCK_BENCHMARKS)

      const finance = result.find((r) => r.niche === 'FINANCE')
      expect(finance).toBeDefined()
      expect(finance!.videoCount).toBe(2)
      expect(finance!.totalViews).toBe(205000)
      expect(finance!.benchmarkCpmMin).toBe(15)
      expect(finance!.benchmarkCpmMax).toBe(50)
      // Actual CPM avg is (28.50 + 24.50) / 2 = 26.50 vs benchmark 32.50 → below
      expect(finance!.performanceVsBenchmark).toBe('below')
    })

    it('returns no_data when no benchmark found for niche', () => {
      const result = report.buildNicheReport(MOCK_METRICS as any, MOCK_BENCHMARKS)
      const saas = result.find((r) => r.niche === 'SAAS')
      expect(saas?.performanceVsBenchmark).toBe('no_data') // no SAAS benchmark in test data
    })
  })

  describe('estimateRevenue()', () => {
    it('calculates RPM as 55% of CPM', () => {
      const estimate = report.estimateRevenue(
        'FINANCE',
        ['US', 'AU'],
        50000,
        { niche: 'FINANCE', market: 'US', cpmMin: 15, cpmMax: 50, cpmAvg: 32.50 },
      )

      expect(estimate.benchmarkCpmAvg).toBe(32.50)
      expect(estimate.estimatedRpm).toBe(17.88) // 32.50 * 0.55
      expect(estimate.estimatedRevenue).toBe(894.00) // (50000 / 1000) * 17.88
      expect(estimate.breakEvenViews).toBeGreaterThan(0)
    })

    it('uses fallback CPM $10 when no benchmark provided', () => {
      const estimate = report.estimateRevenue('UNKNOWN', ['US'], 10000, null)
      expect(estimate.benchmarkCpmAvg).toBe(10)
      expect(estimate.confidenceNote).toContain('fallback')
    })
  })

  describe('buildChannelDashboard()', () => {
    it('builds complete dashboard with all sections', () => {
      const dashboard = report.buildChannelDashboard(
        'INTELLECTUAL',
        MOCK_METRICS as any,
        { newSubscribers: 450, weeklyViews: 12000, weeklyRevenue: 85.50 },
        MOCK_BENCHMARKS,
      )

      expect(dashboard.channelType).toBe('INTELLECTUAL')
      expect(dashboard.totalVideos).toBe(3)
      expect(dashboard.totalViews).toBe(247000) // 120k + 85k + 42k
      expect(dashboard.topVideos.length).toBeLessThanOrEqual(5)
      expect(dashboard.hookPerformance.length).toBe(3)
      expect(dashboard.growthLastWeek.subscribers).toBe(450)
      expect(dashboard.growthLastWeek.revenue).toBe(85.50)
      expect(dashboard.generatedAt).toBeDefined()
    })
  })
})
