// Script Engine — TypeScript types
// Mirrors Prisma schema, used for DTO validation & service contracts

export enum ChannelType {
  FUEL         = 'FUEL',
  INTELLECTUAL = 'INTELLECTUAL',
}

export enum ContentFormat {
  SHORT_FUEL = 'SHORT_FUEL',  // 30-90 sec
  DEEP_ESSAY = 'DEEP_ESSAY',  // 8-15 min
}

export enum ScriptStatus {
  PENDING          = 'PENDING',
  HOOK_GENERATED   = 'HOOK_GENERATED',
  HOOK_APPROVED    = 'HOOK_APPROVED',
  SCRIPT_GENERATED = 'SCRIPT_GENERATED',
  UNDER_REVIEW     = 'UNDER_REVIEW',
  APPROVED         = 'APPROVED',
  REJECTED         = 'REJECTED',
}

export enum EmotionType {
  CURIOSITY = 'CURIOSITY',
  FEAR      = 'FEAR',
  SURPRISE  = 'SURPRISE',
  DESIRE    = 'DESIRE',
  URGENCY   = 'URGENCY',
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

// Segment inside a script — used for production plan export
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

// DTO: POST /api/scripts/generate
export interface GenerateScriptDTO {
  topicId: string
  topicTitle: string
  channelType: ChannelType
  contentFormat: ContentFormat
  niche: Niche
  targetMarkets: string[]
  keywords: string[]
  description?: string
  languages?: string[]
}

// DTO: POST /api/scripts/:id/approve-hook
export interface ApproveHookDTO {
  hookVariantId: string
}

// DTO: PATCH /api/scripts/:id
export interface UpdateScriptDTO {
  scriptFuel?: string
  scriptDeep?: string
  reviewNotes?: string
}

// DTO: POST /api/scripts/:id/reject
export interface RejectScriptDTO {
  reviewNotes: string
  reviewedBy: string
}

// DTO: POST /api/scripts/:id/approve
export interface ApproveScriptDTO {
  approvedBy: string
}

// Query filters for GET /api/scripts
export interface ScriptFilters {
  status?: ScriptStatus
  channelType?: ChannelType
  niche?: Niche
  limit?: number
  offset?: number
}
