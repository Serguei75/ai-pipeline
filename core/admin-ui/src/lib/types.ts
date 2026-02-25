// Типы данных для Admin UI

export interface CostSummary {
  totalCostUsd: string
  totalApiCalls: number
  byModule: Array<{ module: string; costUsd: string; requests: number }>
  byProvider: Array<{ provider: string; costUsd: string; requests: number }>
  last30days: Array<{ id: string; date: string; module: string; provider: string; totalCostUsd: string; requestCount: number }>
}

export interface DailyCost {
  days: number
  data: Array<{ date: string; totalCost: number; byProvider: Record<string, number> }>
}

export interface ThumbnailABTest {
  id: string
  videoId: string
  status: 'RUNNING' | 'COMPLETED' | 'CANCELLED'
  winnerId: string | null
  winnerCtr: number | null
  createdAt: string
  variants: ThumbnailABVariant[]
}

export interface ThumbnailABVariant {
  id: string
  testId: string
  prompt: string
  hookType: string
  provider: string
  imageUrl: string | null
  impressions: number
  clicks: number
  ctr: number | null
  isWinner: boolean
  createdAt: string
}

export interface ThumbnailJob {
  id: string
  videoId: string | null
  prompt: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  provider: string
  model: string
  imageUrl: string | null
  costUsd: string | null
  createdAt: string
}
