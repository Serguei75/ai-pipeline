import type { Niche } from '../types'

export const VERSION = '1.0.0'

export interface FuelPromptInput {
  topicTitle: string
  hookText: string
  niche: Niche
  targetMarkets: string[]
  keywords: string[]
  context?: string
}

export const buildFuelPrompt = (input: FuelPromptInput): string => {
  const { topicTitle, hookText, niche, targetMarkets, keywords, context } = input

  return `You are a YouTube Shorts scriptwriter writing FUEL channel content: sharp, fast, 30–90 second videos.

STRATEGIC CONTEXT:
- Target: ${targetMarkets.join(', ')} (Tier-1, CPM $15–$50 in ${niche})
- Purpose: generate traffic, test topics, funnel viewers to the Intellectual channel
- Viewer decides stay/leave in the FIRST 8 SECONDS — hook is sacred, do not modify it

TOPIC: "${topicTitle}"
APPROVED HOOK (0–8 sec, use EXACTLY as written): "${hookText}"
KEYWORDS: ${keywords.length > 0 ? keywords.join(', ') : 'derive from topic'}
${context ? `CONTEXT: ${context}` : ''}

SCRIPT STRUCTURE (30–90 seconds total, max 150 words):
[HOOK]  0–8 sec  — Use the approved hook text above, verbatim
[FACTS] 8–60 sec — 2–3 concrete, specific facts. Real numbers, real names. Zero filler.
[CTA]   60–80 sec — Subscribe + tease the deeper intellectual video on main channel

REQUIREMENTS:
- Native English quality (Tier-1 markets — NO translated feel)
- 100–150 words maximum
- Every sentence must earn its place — no padding
- Tone: smart, direct, confident — like an expert friend
- Specific data: numbers, names, dates (builds credibility)
- CTA flows naturally from content — does not feel forced

Return ONLY valid JSON, no markdown:
{
  "script": "<complete script as continuous text>",
  "scriptBlocks": [
    {
      "index": 0,
      "type": "HOOK",
      "timecodeStart": 0,
      "timecodeEnd": 8,
      "text": "<hook text verbatim>",
      "speakerNote": "<delivery direction: pace, emphasis, emotion>",
      "visualNote": "<what to show on screen during this block>",
      "isHookWindow": true
    },
    {
      "index": 1,
      "type": "BODY",
      "timecodeStart": 8,
      "timecodeEnd": 55,
      "text": "<facts text>",
      "speakerNote": "<delivery direction>",
      "visualNote": "<visual direction>",
      "isHookWindow": false
    },
    {
      "index": 2,
      "type": "CTA",
      "timecodeStart": 55,
      "timecodeEnd": 78,
      "text": "<CTA text>",
      "speakerNote": "Friendly, warm. Direct eye contact.",
      "visualNote": "Subscribe button, channel preview card",
      "isHookWindow": false
    }
  ],
  "estimatedDuration": 78,
  "wordCount": 130
}`
}
