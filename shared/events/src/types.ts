// ============================================================
// Pipeline Event Types
// All inter-service events flow through Redis Stream: ai-pipeline:events
// ============================================================

export type EventType =
  // Topic lifecycle
  | 'topic.created'
  | 'topic.approved'
  | 'topic.rejected'
  // Script lifecycle
  | 'script.generated'
  | 'script.approved'
  | 'script.hook_flagged'  // retention_8s < threshold
  // Voice lifecycle
  | 'voice.generated'
  | 'voice.failed'
  // Media lifecycle
  | 'media.job_created'
  | 'media.ready'
  | 'media.failed'
  // Analytics
  | 'analytics.video_synced'
  | 'analytics.hook_weak'    // retention_8s < 40%
  | 'analytics.niche_underperforming' // actualRPM < expectedCPM * 0.6
  // Community
  | 'community.comments_synced'
  | 'community.draft_approved'
  | 'community.topic_exported'
  // Localization
  | 'localization.task_created'
  | 'localization.stage1_done'
  | 'localization.completed'

// Base event envelope
export interface PipelineEvent<T = Record<string, unknown>> {
  id?: string          // Redis stream message ID (auto-assigned)
  type: EventType
  source: string       // name of the originating service
  correlationId?: string // links events in the same pipeline run
  timestamp: string    // ISO 8601
  payload: T
}

// ============================================================
// Specific payload types
// ============================================================

export interface TopicApprovedPayload {
  topicId: string
  title: string
  channelType: 'FUEL' | 'INTELLECTUAL'
  niche: string
  targetMarkets: string[]
  estimatedCPM: number
  hookIdeas: string[]
}

export interface ScriptGeneratedPayload {
  scriptId: string
  topicId: string
  format: 'SHORT' | 'DEEP'
  hookScore: number
  wordCount: number
  estimatedDurationSec: number
}

export interface ScriptApprovedPayload extends ScriptGeneratedPayload {
  approvedBy: string
}

export interface ScriptHookFlaggedPayload {
  scriptId: string
  topicId: string
  retention8s: number    // actual from analytics
  threshold: number      // e.g. 40%
  suggestedAction: 'rewrite_hook' | 'rewrite_full'
}

export interface VoiceGeneratedPayload {
  voiceJobId: string
  scriptId: string
  language: string
  audioUrl: string
  durationSeconds: number
  provider: 'elevenlabs' | 'openai'
}

export interface MediaReadyPayload {
  mediaJobId: string
  scriptId: string
  channelType: 'FUEL' | 'INTELLECTUAL'
  videoUrl: string
  resolution: string
  durationSeconds: number
}

export interface AnalyticsVideoSyncedPayload {
  videoId: string
  youtubeVideoId: string
  retention8s: number
  retention60s: number
  ctvShare: number
  rpmActual: number
  ctr: number
  viewCount: number
}

export interface AnalyticsHookWeakPayload {
  videoId: string
  scriptId?: string
  retention8s: number
  threshold: number
  niche: string
}

export interface AnalyticsNicheUnderperformingPayload {
  niche: string
  channelType: 'FUEL' | 'INTELLECTUAL'
  actualRPM: number
  expectedCPM: number
  ratio: number // actualRPM / expectedCPM
}

export interface LocalizationCompletedPayload {
  taskId: string
  youtubeVideoId: string
  languages: string[]
  assetCount: number
}
