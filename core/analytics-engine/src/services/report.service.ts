// Report Service — Pure calculation logic
// No DB calls — receives data and returns computed reports
// Enables easy unit testing and separation of concerns

import type {
  HookPerformanceData,
  NichePerformanceData,
  ChannelDashboard,
  VideoMetricSummary,
  RevenueEstimate,
} from '../types.js'

type VideoMetricRow = {
  youtubeVideoId: string
  title: string
  views: number
  estimatedRevenue: number | null
  cpm: number | null
  avgViewPercentage: number | null
  clickThroughRate: number | null
  hookEmotionType: string | null
  retentionAt8Sec: number | null
  retentionAt30Sec: number | null
  deviceTV: number | null
  niche: string
  publishedAt: Date
}

type NicheBenchmarkRow = {
  niche: string
  market: string
  cpmMin: number
  cpmMax: number
  cpmAvg: number
}

type ChannelSnapshotRow = {
  newSubscribers: number | null
  weeklyViews: number | null
  weeklyRevenue: number | null
} | null

export class ReportService {
  // ── Hook Performance ─────────────────────────────────────────────────────
  // Research: Hook decision in 8 seconds → retention@8sec = key success metric

  buildHookPerformanceReport(metrics: VideoMetricRow[]): HookPerformanceData[] {
    const grouped = new Map<string, VideoMetricRow[]>()

    for (const m of metrics) {
      if (!m.hookEmotionType) continue
      const group = grouped.get(m.hookEmotionType) ?? []
      group.push(m)
      grouped.set(m.hookEmotionType, group)
    }

    const avg = (values: (number | null)[]): number | null => {
      const valid = values.filter((v): v is number => v !== null)
      return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null
    }

    return Array.from(grouped.entries())
      .map(([emotionType, items]) => {
        const sorted = [...items].sort((a, b) => b.views - a.views)
        const top = sorted[0]

        return {
          emotionType,
          videoCount: items.length,
          avgRetentionAt8Sec: avg(items.map((i) => i.retentionAt8Sec)),
          avgRetentionAt30Sec: avg(items.map((i) => i.retentionAt30Sec)),
          avgCtr: avg(items.map((i) => i.clickThroughRate)),
          avgViews: Math.round(items.reduce((a, b) => a + b.views, 0) / items.length),
          avgRevenue: avg(items.map((i) => i.estimatedRevenue)),
          avgCpm: avg(items.map((i) => i.cpm)),
          topVideo: top
            ? { title: top.title, youtubeVideoId: top.youtubeVideoId, views: top.views }
            : null,
        }
      })
      .sort((a, b) => (b.avgRetentionAt8Sec ?? 0) - (a.avgRetentionAt8Sec ?? 0))
  }

  // ── Niche Report ────────────────────────────────────────────────────────

  buildNicheReport(
    metrics: VideoMetricRow[],
    benchmarks: NicheBenchmarkRow[],
  ): NichePerformanceData[] {
    const grouped = new Map<string, VideoMetricRow[]>()
    for (const m of metrics) {
      const group = grouped.get(m.niche) ?? []
      group.push(m)
      grouped.set(m.niche, group)
    }

    const avg = (values: (number | null)[]): number | null => {
      const valid = values.filter((v): v is number => v !== null)
      return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null
    }

    return Array.from(grouped.entries())
      .map(([niche, items]) => {
        const benchmark = benchmarks.find((b) => b.niche === niche && b.market === 'US')
        const actualCpm = avg(items.map((i) => i.cpm))

        let performanceVsBenchmark: NichePerformanceData['performanceVsBenchmark'] = 'no_data'
        if (actualCpm !== null && benchmark) {
          if (actualCpm >= benchmark.cpmAvg * 1.1) performanceVsBenchmark = 'above'
          else if (actualCpm <= benchmark.cpmAvg * 0.9) performanceVsBenchmark = 'below'
          else performanceVsBenchmark = 'at'
        }

        return {
          niche,
          videoCount: items.length,
          totalViews: items.reduce((a, b) => a + b.views, 0),
          totalRevenue: items.some((i) => i.estimatedRevenue !== null)
            ? items.reduce((a, b) => a + (b.estimatedRevenue ?? 0), 0)
            : null,
          avgCpm: actualCpm,
          avgRetention: avg(items.map((i) => i.avgViewPercentage)),
          avgCtr: avg(items.map((i) => i.clickThroughRate)),
          benchmarkCpmMin: benchmark?.cpmMin ?? null,
          benchmarkCpmMax: benchmark?.cpmMax ?? null,
          benchmarkCpmAvg: benchmark?.cpmAvg ?? null,
          performanceVsBenchmark,
        }
      })
      .sort((a, b) => b.totalViews - a.totalViews)
  }

  // ── Channel Dashboard ─────────────────────────────────────────────────

  buildChannelDashboard(
    channelType: string,
    metrics: VideoMetricRow[],
    lastSnapshot: ChannelSnapshotRow,
    benchmarks: NicheBenchmarkRow[],
  ): ChannelDashboard {
    const avg = (values: (number | null)[]): number | null => {
      const valid = values.filter((v): v is number => v !== null)
      return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null
    }

    const topVideos: VideoMetricSummary[] = [...metrics]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((m) => ({
        youtubeVideoId: m.youtubeVideoId,
        title: m.title,
        views: m.views,
        revenue: m.estimatedRevenue,
        cpm: m.cpm,
        avgViewPercentage: m.avgViewPercentage,
        clickThroughRate: m.clickThroughRate,
        hookEmotionType: m.hookEmotionType,
        publishedAt: m.publishedAt,
      }))

    const totalRevenue = metrics.some((m) => m.estimatedRevenue !== null)
      ? metrics.reduce((a, b) => a + (b.estimatedRevenue ?? 0), 0)
      : null

    return {
      channelType,
      totalVideos: metrics.length,
      totalViews: metrics.reduce((a, b) => a + b.views, 0),
      totalRevenue,
      avgCpm: avg(metrics.map((m) => m.cpm)),
      avgRetention: avg(metrics.map((m) => m.avgViewPercentage)),
      avgCtr: avg(metrics.map((m) => m.clickThroughRate)),
      ctvPercentage: avg(metrics.map((m) => m.deviceTV)),
      topVideos,
      hookPerformance: this.buildHookPerformanceReport(metrics),
      nicheBreakdown: this.buildNicheReport(metrics, benchmarks),
      growthLastWeek: {
        subscribers: lastSnapshot?.newSubscribers ?? null,
        views: lastSnapshot?.weeklyViews ?? null,
        revenue: lastSnapshot?.weeklyRevenue ?? null,
      },
      generatedAt: new Date().toISOString(),
    }
  }

  // ── Revenue Estimator ────────────────────────────────────────────────
  // Estimate revenue BEFORE video is published, using niche benchmarks

  estimateRevenue(
    niche: string,
    markets: string[],
    targetViews: number,
    benchmark: NicheBenchmarkRow | null,
  ): RevenueEstimate {
    const cpmAvg = benchmark?.cpmAvg ?? 10 // fallback to $10 if no benchmark
    // YouTube pays creators ~55% of ad revenue (RPM = CPM * 0.55)
    const rpm = Math.round(cpmAvg * 0.55 * 100) / 100
    const estimatedRevenue = Math.round((targetViews / 1000) * rpm * 100) / 100
    const breakEvenViews = Math.round(10 / rpm * 1000) // views to earn $10

    return {
      niche,
      targetViews,
      markets,
      benchmarkCpmAvg: cpmAvg,
      estimatedRpm: rpm,
      estimatedRevenue,
      breakEvenViews,
      confidenceNote: benchmark
        ? `Based on Q1 2026 benchmark for ${niche}/US market`
        : 'No benchmark data — using $10 CPM fallback',
    }
  }
}
