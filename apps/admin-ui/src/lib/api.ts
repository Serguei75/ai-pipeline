// Unified API client for all 5 AI Pipeline microservices

export const SERVICES = {
  topic:     process.env.NEXT_PUBLIC_TOPIC_ENGINE_URL     ?? 'http://localhost:3001',
  script:    process.env.NEXT_PUBLIC_SCRIPT_ENGINE_URL    ?? 'http://localhost:3002',
  voice:     process.env.NEXT_PUBLIC_VOICE_ENGINE_URL     ?? 'http://localhost:3003',
  media:     process.env.NEXT_PUBLIC_MEDIA_ENGINE_URL     ?? 'http://localhost:3004',
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_ENGINE_URL ?? 'http://localhost:3005',
} as const

export type ServiceName = keyof typeof SERVICES

export interface ServiceHealth {
  service: ServiceName
  status: 'ok' | 'error' | 'offline'
  data?: Record<string, unknown>
}

export async function checkServiceHealth(service: ServiceName): Promise<ServiceHealth> {
  try {
    const res = await fetch(`${SERVICES[service]}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (!res.ok) return { service, status: 'error' }
    const data = await res.json()
    return { service, status: 'ok', data }
  } catch {
    return { service, status: 'offline' }
  }
}

// ── Topic Engine ────────────────────────────────────────────────────────

export interface Topic {
  id: string
  title: string
  niche: string
  status: string
  hookScore: number | null
  researchStatus: string
  createdAt: string
}

export async function fetchTopics(p?: { niche?: string; status?: string; limit?: number; offset?: number }) {
  const url = new URL(`${SERVICES.topic}/api/topics`)
  if (p?.niche) url.searchParams.set('niche', p.niche)
  if (p?.status) url.searchParams.set('status', p.status)
  if (p?.limit) url.searchParams.set('limit', String(p.limit))
  if (p?.offset) url.searchParams.set('offset', String(p.offset))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json() as Promise<{ data: Topic[]; count: number }>
}

export async function createTopic(body: { title: string; niche: string }): Promise<Topic> {
  const res = await fetch(`${SERVICES.topic}/api/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create topic')
  return res.json()
}

// ── Script Engine ─────────────────────────────────────────────────────

export interface Script {
  id: string
  topicId: string
  channelType: string
  contentFormat: string
  status: string
  hookEmotionType: string | null
  hookScore: number | null
  totalWordCount: number | null
  estimatedDurationSec: number | null
  createdAt: string
}

export async function fetchScripts(p?: { status?: string; channelType?: string; limit?: number }) {
  const url = new URL(`${SERVICES.script}/api/scripts`)
  if (p?.status) url.searchParams.set('status', p.status)
  if (p?.channelType) url.searchParams.set('channelType', p.channelType)
  if (p?.limit) url.searchParams.set('limit', String(p.limit))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch scripts')
  return res.json() as Promise<{ data: Script[]; count: number }>
}

// ── Voice Engine ──────────────────────────────────────────────────────

export interface VoiceJob {
  id: string
  scriptId: string
  status: string
  language: string
  voiceId: string
  createdAt: string
}

export async function fetchVoiceJobs(p?: { status?: string; limit?: number }) {
  const url = new URL(`${SERVICES.voice}/api/voice/jobs`)
  if (p?.status) url.searchParams.set('status', p.status)
  if (p?.limit) url.searchParams.set('limit', String(p.limit))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch voice jobs')
  return res.json() as Promise<{ data: VoiceJob[]; count: number }>
}

// ── Media Engine ──────────────────────────────────────────────────────

export interface MediaJob {
  id: string
  scriptId: string
  channelType: string
  contentFormat: string
  status: string
  createdAt: string
}

export async function fetchMediaJobs(p?: { status?: string; channelType?: string; limit?: number }) {
  const url = new URL(`${SERVICES.media}/api/media/jobs`)
  if (p?.status) url.searchParams.set('status', p.status)
  if (p?.channelType) url.searchParams.set('channelType', p.channelType)
  if (p?.limit) url.searchParams.set('limit', String(p.limit))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch media jobs')
  return res.json() as Promise<{ data: MediaJob[]; count: number }>
}

// ── Analytics Engine ─────────────────────────────────────────────────

export interface HookPerformanceItem {
  emotionType: string
  videoCount: number
  avgRetentionAt8Sec: number | null
  avgRetentionAt30Sec: number | null
  avgCtr: number | null
  avgViews: number
  avgRevenue: number | null
  avgCpm: number | null
  topVideo: { title: string; youtubeVideoId: string; views: number } | null
}

export interface NichePerformanceItem {
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

export interface ChannelDashboard {
  channelType: string
  totalVideos: number
  totalViews: number
  totalRevenue: number | null
  avgCpm: number | null
  avgRetention: number | null
  avgCtr: number | null
  ctvPercentage: number | null
  topVideos: Array<{
    youtubeVideoId: string; title: string; views: number
    revenue: number | null; cpm: number | null; hookEmotionType: string | null
  }>
  hookPerformance: HookPerformanceItem[]
  nicheBreakdown: NichePerformanceItem[]
  growthLastWeek: { subscribers: number | null; views: number | null; revenue: number | null }
  generatedAt: string
}

export async function fetchChannelDashboard(channelType: string): Promise<ChannelDashboard> {
  const url = new URL(`${SERVICES.analytics}/api/analytics/channels/dashboard`)
  url.searchParams.set('channelType', channelType)
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}

export async function fetchHookPerformance() {
  const res = await fetch(`${SERVICES.analytics}/api/analytics/reports/hooks`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch hook performance')
  return res.json() as Promise<{ data: HookPerformanceItem[] }>
}

export async function fetchNicheReport() {
  const res = await fetch(`${SERVICES.analytics}/api/analytics/reports/niches`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch niche report')
  return res.json() as Promise<{ data: NichePerformanceItem[] }>
}

export async function fetchRevenueEstimate(params: { niche: string; markets: string[]; targetViews: number }) {
  const url = new URL(`${SERVICES.analytics}/api/analytics/reports/estimate`)
  url.searchParams.set('niche', params.niche)
  url.searchParams.set('markets', params.markets.join(','))
  url.searchParams.set('targetViews', String(params.targetViews))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch revenue estimate')
  return res.json()
}
