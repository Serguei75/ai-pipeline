import type { ChannelType, ContentFormat, Niche } from '../types'

export const VERSION = '1.0.0'

export interface HookPromptInput {
  topicTitle: string
  niche: Niche
  channelType: ChannelType
  contentFormat: ContentFormat
  targetMarkets: string[]
  count?: number
}

export interface HookPromptOutput {
  hooks: Array<{
    text: string
    emotionType: string
    visualSuggestion: string
    score: number
  }>
}

export const buildHookPrompt = (input: HookPromptInput): string => {
  const { topicTitle, niche, channelType, targetMarkets, count = 5 } = input

  return `You are an elite YouTube hook writer. Your hooks determine whether viewers stay or leave.

RESEARCH-BACKED RULES:
- The viewer's watch/leave decision happens in the first 8 SECONDS
- By the 60th second, 55% of viewers are already gone
- "AI slop" (generic, robotic hooks) gets 70% LOWER retention than human-quality writing
- 45% of watch time is on Connected TV — hooks must be visually compelling on a large screen
- Target markets: ${targetMarkets.join(', ')} — sophisticated Tier-1 audiences who hate clickbait

TOPIC: "${topicTitle}"
Niche: ${niche} | Channel: ${channelType}

GENERATE ${count} HOOK VARIANTS (0–8 seconds each):

EACH HOOK MUST:
- Be 20–35 words maximum (can be spoken in 6–8 seconds)
- Create IMMEDIATE pattern interrupt: surprise, fear, curiosity, desire, or urgency
- Contain a SPECIFIC claim or question — no vague "You won’t believe..."
- Promise a clear payoff that makes the viewer commit to the full video
- Sound HUMAN and conversational — like a smart friend who just learned something important
- Be honest: the hook must deliver on what the video actually covers

Return ONLY valid JSON, no markdown:
{
  "hooks": [
    {
      "text": "<hook text, 2–3 sentences max>",
      "emotionType": "<CURIOSITY|FEAR|SURPRISE|DESIRE|URGENCY>",
      "visualSuggestion": "<one sentence: what to show on screen during this hook>",
      "score": <integer 0–100, your own quality estimate>
    }
  ]
}`
}
