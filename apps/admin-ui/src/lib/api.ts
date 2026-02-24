// API client for all 5 AI Pipeline engines
// Each engine exposes a REST API on its own port

const ENGINES = {
  topic:     process.env.NEXT_PUBLIC_TOPIC_ENGINE_URL    ?? 'http://localhost:3001',
  script:    process.env.NEXT_PUBLIC_SCRIPT_ENGINE_URL   ?? 'http://localhost:3002',
  voice:     process.env.NEXT_PUBLIC_VOICE_ENGINE_URL    ?? 'http://localhost:3003',
  media:     process.env.NEXT_PUBLIC_MEDIA_ENGINE_URL    ?? 'http://localhost:3004',
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_ENGINE_URL ?? 'http://localhost:3005',
} as const

type Engine = keyof typeof ENGINES

async function apiFetch<T>(engine: Engine, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINES[engine]}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status} from ${engine}`)
  }
  return res.json() as Promise<T>
}

// ── Health checks ─────────────────────────────────────────────────────

export interface HealthResult {
  engine: Engine
  service: string
  status: string
  ok: boolean
  version?: string
  timestamp?: string
}

export async function checkHealth(engine: Engine): Promise<HealthResult> {
  try {
    const data = await apiFetch<{ status: string; service: string; version?: string; timestamp?: string }>(engine, '/health')
    return { engine, ...data, ok: data.status === 'ok' }
  } catch {
    return { engine, service: engine, status: 'error', ok: false }
  }
}

export async function checkAllHealth(): Promise<HealthResult[]> {
  return Promise.all((Object.keys(ENGINES) as Engine[]).map(checkHealth))
}

// ── Topic Engine (port 3001) ───────────────────────────────────────────

export const topicApi = {
  list: (params: Record<string, string> = {}) =>
    apiFetch<{ data: any[]; count: number }>('topic', `/api/topics?${new URLSearchParams(params)}`),
  getById: (id: string) => apiFetch<any>('topic', `/api/topics/${id}`),
  generate: (body: { channelType: string; niche: string; count?: number }) =>
    apiFetch<any>('topic', '/api/topics/generate', { method: 'POST', body: JSON.stringify(body) }),
  approve: (id: string) =>
    apiFetch<any>('topic', `/api/topics/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) }),
  reject: (id: string) =>
    apiFetch<any>('topic', `/api/topics/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }),
}

// ── Script Engine (port 3002) ──────────────────────────────────────────

export const scriptApi = {
  list: () => apiFetch<{ data: any[]; count: number }>('script', '/api/scripts'),
  getById: (id: string) => apiFetch<any>('script', `/api/scripts/${id}`),
  generate: (body: { topicId: string; channelType: string; contentFormat: string }) =>
    apiFetch<any>('script', '/api/scripts/generate', { method: 'POST', body: JSON.stringify(body) }),
}

// ── Voice Engine (port 3003) ───────────────────────────────────────────

export const voiceApi = {
  listJobs: () => apiFetch<{ data: any[]; count: number }>('voice', '/api/voice/jobs'),
  getJob: (id: string) => apiFetch<any>('voice', `/api/voice/jobs/${id}`),
}

// ── Media Engine (port 3004) ───────────────────────────────────────────

export const mediaApi = {
  listJobs: (params: Record<string, string> = {}) =>
    apiFetch<{ data: any[]; count: number }>('media', `/api/media/jobs?${new URLSearchParams(params)}`),
  getJob: (id: string) => apiFetch<any>('media', `/api/media/jobs/${id}`),
  getAssembly: (id: string) => apiFetch<any>('media', `/api/media/jobs/${id}/assembly`),
  generateAvatars: (id: string) =>
    apiFetch<any>('media', `/api/media/jobs/${id}/generate-avatars`, { method: 'POST', body: '{}' }),
  fetchBroll: (id: string) =>
    apiFetch<any>('media', `/api/media/jobs/${id}/fetch-broll`, { method: 'POST', body: '{}' }),
  listProfiles: () => apiFetch<{ data: any[]; count: number }>('media', '/api/media/profiles/avatars'),
  listHeygenAvatars: () => apiFetch<any[]>('media', '/api/media/heygen/avatars'),
}

// ── Analytics Engine (port 3005) ──────────────────────────────────────

export const analyticsApi = {
  listVideos: (params: Record<string, string> = {}) =>
    apiFetch<{ data: any[]; count: number }>('analytics', `/api/analytics/videos?${new URLSearchParams(params)}`),
  getDashboard: (channelType: string) =>
    apiFetch<any>('analytics', `/api/analytics/channels/dashboard?channelType=${channelType}`),
  getHookReport: () =>
    apiFetch<{ data: any[]; generatedAt: string }>('analytics', '/api/analytics/reports/hooks'),
  getNicheReport: () =>
    apiFetch<{ data: any[]; generatedAt: string }>('analytics', '/api/analytics/reports/niches'),
  estimateRevenue: (niche: string, targetViews: number, markets = 'US,AU') =>
    apiFetch<any>('analytics', `/api/analytics/reports/estimate?niche=${niche}&markets=${markets}&targetViews=${targetViews}`),
  syncVideo: (youtubeVideoId: string) =>
    apiFetch<any>('analytics', `/api/analytics/videos/${youtubeVideoId}/sync`, { method: 'POST', body: '{}' }),
}
