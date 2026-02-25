export type ChannelType = 'FUEL' | 'INTELLECTUAL'
export type HookTrigger = 'FEAR' | 'CURIOSITY' | 'SURPRISE' | 'DESIRE' | 'SOCIAL_PROOF'
export type TestStatus = 'GENERATING' | 'RUNNING' | 'CONCLUDED' | 'CANCELLED'

export interface CreateTestDto {
  scriptId: string
  topicTitle: string
  channelType: ChannelType
  niche?: string
  triggersOverride?: HookTrigger[] // if omitted, uses defaults per channel type
}

export interface UpdatePerformanceDto {
  youtubeVideoId?: string
  retention8s?: number
  retention60s?: number
  ctr?: number
  viewCount?: number
  avgWatchSec?: number
}

// Trigger instructions for OpenAI
export const TRIGGER_INSTRUCTIONS: Record<HookTrigger, string> = {
  FEAR:
    'Write a fear-based hook that reveals a costly mistake, risk, or danger the viewer is likely making RIGHT NOW.',
  CURIOSITY:
    'Write a curiosity-gap hook that teases something counterintuitive, secret, or unknown that the viewer desperately wants to know.',
  SURPRISE:
    'Write a surprise hook that challenges a widely-held assumption or reveals an unexpected, almost unbelievable result.',
  DESIRE:
    'Write a desire-based hook that promises a specific, concrete, desirable outcome the viewer wants to achieve.',
  SOCIAL_PROOF:
    'Write a social proof hook based on what high-achievers, a large group, or successful people do differently from most.',
}

// Best triggers per channel type
export const DEFAULT_TRIGGERS: Record<ChannelType, HookTrigger[]> = {
  FUEL: ['FEAR', 'SURPRISE', 'CURIOSITY'],          // Shorts: shock + intrigue
  INTELLECTUAL: ['CURIOSITY', 'DESIRE', 'SOCIAL_PROOF'], // Essays: depth + aspiration
}

// Performance score formula (weighted)
// retention_8s has highest weight as the most critical CTV metric
export function computeScore(v: UpdatePerformanceDto): number {
  const r8 = v.retention8s ?? 0
  const r60 = v.retention60s ?? 0
  const ctr = v.ctr ?? 0
  return r8 * 0.5 + r60 * 0.3 + ctr * 0.2
}
