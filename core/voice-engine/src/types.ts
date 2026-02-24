export enum ChannelType {
  FUEL         = 'FUEL',
  INTELLECTUAL = 'INTELLECTUAL',
}

export enum ContentFormat {
  SHORT_FUEL = 'SHORT_FUEL',
  DEEP_ESSAY = 'DEEP_ESSAY',
}

export enum VoiceJobStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}

// DTO: POST /api/voice/jobs
export interface CreateVoiceJobDTO {
  scriptId: string
  channelType: ChannelType
  contentFormat: ContentFormat
  voiceProfileId: string
  scriptText: string
  languages?: string[]  // default: ['en']
}

// DTO: POST /api/voice/jobs/:id/localize
export interface LocalizeJobDTO {
  languages: string[]                   // e.g. ['de', 'es', 'ja']
  translatedTexts: Record<string, string> // { de: '...translated script...' }
}

// Returned by GET /api/voice/jobs/:id/package
export interface YouTubeAudioTrack {
  language: string
  url: string
  isMain: boolean
  youtubeTrackLabel: string | null
  durationSec: number | null
  sizeBytes: number | null
}

export interface YouTubeMultiAudioPackage {
  jobId: string
  scriptId: string
  audioTracks: YouTubeAudioTrack[]
  totalTracks: number
  // YouTube Multi-Audio: one video → multiple audio tracks
  // Increases watch time without splitting views across duplicates
  uploadInstructions: string
}

export interface VoiceJobFilters {
  status?: VoiceJobStatus
  channelType?: ChannelType
  limit?: number
  offset?: number
}
