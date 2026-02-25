/**
 * Unified API client for AI Pipeline.
 * All calls go through API Gateway (:3100) which routes to the correct service.
 * Set NEXT_PUBLIC_API_URL in .env to point to the gateway.
 */

const API_BASE =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.API_URL) || 'http://localhost:3100'

const json = (r: Response) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.url}`)
  return r.json()
}

const post = (url: string, data?: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  }).then(json)

const put = (url: string, data?: unknown) =>
  fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  }).then(json)

const get = (url: string) => fetch(url).then(json)

// ── Health ─────────────────────────────────────────────────────────────────
const health = {
  gateway: () => get(`${API_BASE}/health`),
  all: () => get(`${API_BASE}/health/all`),
  registry: () => get(`${API_BASE}/registry`),
}

// ── Topic Engine ───────────────────────────────────────────────────────────
const topics = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/topics${qs}`)
  },
  get: (id: string) => get(`${API_BASE}/topics/${id}`),
  create: (data: unknown) => post(`${API_BASE}/topics`, data),
  approve: (id: string) => post(`${API_BASE}/topics/${id}/approve`),
  reject: (id: string) => post(`${API_BASE}/topics/${id}/reject`),
  generate: (data: unknown) => post(`${API_BASE}/topics/generate`, data),
}

// ── Script Engine ──────────────────────────────────────────────────────────
const scripts = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/scripts${qs}`)
  },
  get: (id: string) => get(`${API_BASE}/scripts/${id}`),
  generate: (data: unknown) => post(`${API_BASE}/scripts/generate`, data),
  approve: (id: string) => post(`${API_BASE}/scripts/${id}/approve`),
  flagHook: (id: string) => post(`${API_BASE}/scripts/${id}/flag-hook`),
}

// ── Voice Engine ───────────────────────────────────────────────────────────
const voice = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/voice${qs}`)
  },
  generate: (data: unknown) => post(`${API_BASE}/voice/generate`, data),
  get: (id: string) => get(`${API_BASE}/voice/${id}`),
}

// ── Media Engine ───────────────────────────────────────────────────────────
const media = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/media${qs}`)
  },
  create: (data: unknown) => post(`${API_BASE}/media`, data),
  get: (id: string) => get(`${API_BASE}/media/${id}`),
}

// ── Analytics Engine ───────────────────────────────────────────────────────
const analytics = {
  videos: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/analytics/videos${qs}`)
  },
  syncVideo: (id: string) => post(`${API_BASE}/analytics/videos/${id}/sync`),
  dashboard: () => get(`${API_BASE}/analytics/channels/dashboard`),
  hooks: () => get(`${API_BASE}/analytics/reports/hooks`),
  niches: () => get(`${API_BASE}/analytics/reports/niches`),
  estimate: (params: Record<string, string>) => {
    const qs = '?' + new URLSearchParams(params).toString()
    return get(`${API_BASE}/analytics/reports/estimate${qs}`)
  },
}

// ── Community Engine ───────────────────────────────────────────────────────
const community = {
  comments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/community/comments${qs}`)
  },
  sync: (videoYoutubeId: string) =>
    post(`${API_BASE}/community/sync`, { videoYoutubeId }),
  classify: (batchSize = 30) =>
    post(`${API_BASE}/community/classify`, { batchSize }),
  drafts: (status = 'NEW') =>
    get(`${API_BASE}/community/drafts?status=${status}`),
  approveDraft: (id: string, data: unknown) =>
    put(`${API_BASE}/community/drafts/${id}/approve`, data),
  declineDraft: (id: string, reason?: string) =>
    put(`${API_BASE}/community/drafts/${id}/decline`, { reason }),
  topicSuggestions: () => get(`${API_BASE}/community/topics`),
  exportTopic: (id: string) => post(`${API_BASE}/community/topics/${id}/export`),
  stats: () => get(`${API_BASE}/community/stats`),
}

// ── Localization Engine ────────────────────────────────────────────────────
const localization = {
  tasks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get(`${API_BASE}/localization/tasks${qs}`)
  },
  create: (data: unknown) => post(`${API_BASE}/localization/tasks`, data),
  get: (id: string) => get(`${API_BASE}/localization/tasks/${id}`),
  process: (id: string, stage: 1 | 2) =>
    post(`${API_BASE}/localization/tasks/${id}/process`, { stage }),
  getPackage: (id: string) =>
    get(`${API_BASE}/localization/tasks/${id}/package`),
  stats: () => get(`${API_BASE}/localization/stats`),
}

// ── Export ─────────────────────────────────────────────────────────────────
export const api = {
  health,
  topics,
  scripts,
  voice,
  media,
  analytics,
  community,
  localization,
}

export type ApiClient = typeof api
