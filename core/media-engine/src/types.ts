export enum ChannelType {
  FUEL         = 'FUEL',
  INTELLECTUAL = 'INTELLECTUAL',
}

export enum ContentFormat {
  SHORT_FUEL = 'SHORT_FUEL',
  DEEP_ESSAY = 'DEEP_ESSAY',
}

export enum MediaJobStatus {
  PENDING           = 'PENDING',
  AVATAR_GENERATING = 'AVATAR_GENERATING',
  BROLL_FETCHING    = 'BROLL_FETCHING',
  ASSEMBLY_READY    = 'ASSEMBLY_READY',
  COMPLETED         = 'COMPLETED',
  FAILED            = 'FAILED',
}

export enum ClipStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY      = 'READY',
  FAILED     = 'FAILED',
}

// DTO: POST /api/media/jobs
export interface CreateMediaJobDTO {
  scriptId: string
  voiceJobId?: string
  channelType: ChannelType
  contentFormat: ContentFormat
  avatarProfileId?: string
  // ScriptSegment[] from Script Engine
  segments: ScriptSegment[]
}

// Script segment (mirrors Script Engine types)
export interface ScriptSegment {
  type: 'AVATAR' | 'SLIDE' | 'BROLL' | 'GRAPHIC' | 'SCREEN_DEMO'
  startSec: number
  endSec: number
  text: string
  notes?: string
  avatarPlan?: 'STUDIO' | 'CLOSEUP' | 'DIALOGUE'
  slideContent?: string
  visualSuggestion?: string
}

// Pexels video result
export interface PexelsVideo {
  id: number
  url: string
  videoUrl: string   // HD download URL
  previewUrl: string
  width: number
  height: number
  durationSec: number
  photographer: string
}

// HeyGen video job result
export interface HeyGenVideoResult {
  videoId: string
  status: 'processing' | 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  errorMessage?: string
}

// Final output: timeline entry for video editor
export interface AssemblyEntry {
  index: number
  type: 'AVATAR' | 'BROLL' | 'SLIDE' | 'GRAPHIC' | 'SCREEN_DEMO'
  startSec: number
  endSec: number
  durationSec: number
  assetUrl?: string     // video clip URL
  audioUrl?: string     // voice track URL
  text: string          // spoken/display text
  notes?: string
  visualDescription?: string
  transition: 'cut' | 'fade'
}

// Full assembly plan returned to video editor
export interface VideoAssemblyPlan {
  jobId: string
  scriptId: string
  channelType: ChannelType
  contentFormat: ContentFormat
  totalDurationSec: number
  resolution: { width: number; height: number }
  timeline: AssemblyEntry[]
  // Human-readable editing notes
  editingNotes: string[]
  // FFmpeg concat manifest (segments list)
  ffmpegManifest: string
  generatedAt: string
}

export interface MediaJobFilters {
  status?: MediaJobStatus
  channelType?: ChannelType
  limit?: number
  offset?: number
}
