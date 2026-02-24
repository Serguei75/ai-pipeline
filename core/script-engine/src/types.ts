// Script Engine — complete TypeScript types
// Principle: no `any`, no stubs, all edge cases typed

export enum ChannelType {
  FUEL         = 'FUEL',
  INTELLECTUAL = 'INTELLECTUAL',
}

export enum ContentFormat {
  SHORT_FUEL = 'SHORT_FUEL',  // 30–90 sec
  DEEP_ESSAY = 'DEEP_ESSAY',  // 8–15 min
}

export enum Niche {
  FINANCE    = 'FINANCE',
  SAAS       = 'SAAS',
  EDUCATION  = 'EDUCATION',
  HEALTH     = 'HEALTH',
  TECH       = 'TECH',
  MARKETING  = 'MARKETING',
  CRYPTO     = 'CRYPTO',
}

export enum ScriptStatus {
  GENERATING = 'GENERATING',
  DRAFT      = 'DRAFT',
  REVIEW     = 'REVIEW',
  APPROVED   = 'APPROVED',
  REJECTED   = 'REJECTED',
  ARCHIVED   = 'ARCHIVED',
}

export enum HookEmotion {
  CURIOSITY = 'CURIOSITY',
  FEAR      = 'FEAR',
  SURPRISE  = 'SURPRISE',
  DESIRE    = 'DESIRE',
  URGENCY   = 'URGENCY',
}

export enum ScriptBlockType {
  HOOK     = 'HOOK',      // 0–8 sec — CRITICAL
  OVERVIEW = 'OVERVIEW',  // 8–60 sec — second retention gate
  BODY     = 'BODY',
  EXAMPLE  = 'EXAMPLE',
  CTA      = 'CTA',
  AVATAR   = 'AVATAR',
  SLIDE    = 'SLIDE',
  BROLL    = 'BROLL',
}

export interface ScriptBlock {
  index: number
  type: ScriptBlockType
  timecodeStart: number       // seconds
  timecodeEnd: number         // seconds
  text: string
  speakerNote?: string        // direction for avatar/speaker
  visualNote?: string         // B-roll / slide suggestion
  isHookWindow?: boolean      // true if 0–8 sec
}

export interface HookVariant {
  text: string
  emotionType: HookEmotion
  visualSuggestion: string
  score?: number
}

export interface HookGenerationResult {
  hooks: HookVariant[]
  topHook: HookVariant
}

export interface GeneratedScript {
  script: string
  scriptBlocks: ScriptBlock[]
  estimatedDuration: number   // seconds
  wordCount: number
}

// DTOs
export interface CreateScriptDTO {
  topicId: string
  topicTitle: string
  channelType: ChannelType
  contentFormat: ContentFormat
  niche: Niche
  targetMarkets: string[]
  languages?: string[]
  context?: string
}

export interface UpdateScriptDTO {
  hookText?: string
  script?: string
  scriptBlocks?: ScriptBlock[]
  status?: ScriptStatus
  rejectionNote?: string
}

export interface ApproveScriptDTO {
  approvedBy: string
  approvedHookId: string
}

export interface RegenerateScriptDTO {
  feedback?: string
  keepHook?: boolean
}

export interface ScriptFilters {
  status?: ScriptStatus
  channelType?: ChannelType
  contentFormat?: ContentFormat
  niche?: Niche
  topicId?: string
  page?: number
  perPage?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}
