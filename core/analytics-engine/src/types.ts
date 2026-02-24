export enum ChannelType {
  FUEL         = 'FUEL',
  INTELLECTUAL = 'INTELLECTUAL',
}

export enum Niche {
  FINANCE   = 'FINANCE',
  SAAS      = 'SAAS',
  EDUCATION = 'EDUCATION',
  HEALTH    = 'HEALTH',
  TECH      = 'TECH',
  MARKETING = 'MARKETING',
  CRYPTO    = 'CRYPTO',
}

export enum SyncStatus {
  PENDING   = 'PENDING',
  RUNNING   = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
}

// DTO: POST /api/analytics/videos
export interface RegisterVideoDTO {
  scriptId: string
  youtubeVideoId: string
  channelId: string
  channelType: ChannelType
  niche: Niche
  hookEmotionType?: string   // FEAR | CURIOSITY | SURPRISE | DESIRE | URGENCY
  hookScore?: number
}

// DTO: POST /api/analytics/channels/sync
export interface SyncChannelDTO {
  channelId: string
  channelType: ChannelType
}

// ── Report output types ─────────────────────────────────────────────────────

export interface HookPerformanceData {
  emotionType: string
  videoCount: number
  avgRetentionAt8Sec: number | null    // KEY: % watching at 8 sec (the hook window)
  avgRetentionAt30Sec: number | null
  avgCtr: number | null                // click-through rate
  avgViews: number
  avgRevenue: number | null
  avgCpm: number | null
  topVideo: { title: string; youtubeVideoId: string; views: number } | null
}

export interface NichePerformanceData {
  niche: string
  videoCount: number
  totalViews: number
  totalRevenue: number | null
  avgCpm: number | null
  avgRetention: number | null
  avgCtr: number | null
  benchmarkCpmMin: number | null
  benchmarkCpmMax: number | null
  benchmarkCpmAvg: number | null
  performanceVsBenchmark: 'above' | 'at' | 'below' | 'no_data'
}

export interface VideoMetricSummary {
  youtubeVideoId: string
  title: string
  views: number
  revenue: number | null
  cpm: number | null
  avgViewPercentage: number | null
  clickThroughRate: number | null
  hookEmotionType: string | null
  publishedAt: Date
}

export interface ChannelDashboard {
  channelType: string
  totalVideos: number
  totalViews: number
  totalRevenue: number | null
  avgCpm: number | null
  avgRetention: number | null
  avgCtr: number | null
  ctvPercentage: number | null          // % of views on TV (benchmark: 45%)
  topVideos: VideoMetricSummary[]       // top 5 by views
  hookPerformance: HookPerformanceData[] // ranked by retention@8sec
  nicheBreakdown: NichePerformanceData[]
  growthLastWeek: {
    subscribers: number | null
    views: number | null
    revenue: number | null
  }
  generatedAt: string
}

export interface RevenueEstimate {
  niche: string
  targetViews: number
  markets: string[]
  benchmarkCpmAvg: number
  estimatedRpm: number              // RPM = CPM * 0.55 (YouTube's 45% cut)
  estimatedRevenue: number          // USD
  breakEvenViews: number            // views needed to earn $10
  confidenceNote: string
}
