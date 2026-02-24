import type { Niche } from '../types'

export const VERSION = '1.0.0'

export interface DeepPromptInput {
  topicTitle: string
  hookText: string
  niche: Niche
  targetMarkets: string[]
  keywords: string[]
  context?: string
}

export const buildDeepPrompt = (input: DeepPromptInput): string => {
  const { topicTitle, hookText, niche, targetMarkets, keywords, context } = input

  return `You are an elite YouTube video essayist writing for the INTELLECTUAL channel. Deep, structured, 8–15 minute videos with avatar presenters.

STRATEGIC CONTEXT:
- Target: ${targetMarkets.join(', ')} (Tier-1, CPM $15–$50 in ${niche})
- 45% of watch time is on CTV (Connected TV/big screen) — design for that experience
- Retention benchmarks: >80% at 8 seconds, >50% at 60 seconds, >40% at 3 minutes
- "AI slop" fails completely here — this must feel like a brilliant human speaking
- Avatar presenter delivers this — write for natural, conversational speech

TOPIC: "${topicTitle}"
APPROVED HOOK (0–8 sec, use EXACTLY): "${hookText}"
KEYWORDS: ${keywords.length > 0 ? keywords.join(', ') : 'derive from topic'}
${context ? `ADDITIONAL CONTEXT / FEEDBACK TO ADDRESS: ${context}` : ''}

SCRIPT STRUCTURE (8–15 minutes = 1200–2200 words):

[HOOK] 0–8 sec
- The approved hook verbatim. Do not change a word.

[OVERVIEW] 8–60 sec
- Brief map: what they’ll learn and why it matters RIGHT NOW
- This is the "second hook" — make viewer commit to watching the full video

[BLOCK_1: Core Concept] 1–3 min
- Clear explanation. Use analogies where helpful. Zero filler sentences.

[BLOCK_2: Evidence & Examples] 3–6 min
- 2–3 real-world examples or data points. Specific: names, numbers, dates.
- Make abstract concepts concrete.

[BLOCK_3: Objections & Nuance] 6–9 min
- Address main counterarguments. This builds trust and authority.
- "You might be thinking..." — conversational, not defensive.

[BLOCK_4: Practical Takeaways] 9–12 min
- Concrete steps or conclusions the viewer can act on TODAY
- Specific, not generic platitudes.

[CTA] 12–14 min
- Natural, earned call-to-action. Do NOT beg.
- Frame as: "if this was valuable, here’s what’s next"
- Suggest a specific related video/playlist

REQUIREMENTS:
- Native English, Tier-1 quality
- 1200–2200 words total
- Conversational but authoritative — trusted expert friend
- Transitions between blocks feel natural, not "moving on to point 3"
- Add [SLIDE] or [BROLL] suggestions in visualNote where visuals would help
- CTV-optimized: clear large text cues, no rapid cuts, strong audio design notes

Return ONLY valid JSON, no markdown:
{
  "script": "<complete script as continuous readable text>",
  "scriptBlocks": [
    {
      "index": 0,
      "type": "HOOK",
      "timecodeStart": 0,
      "timecodeEnd": 8,
      "text": "<hook verbatim>",
      "speakerNote": "<exact avatar delivery direction>",
      "visualNote": "<strong opening visual>",
      "isHookWindow": true
    },
    {
      "index": 1,
      "type": "OVERVIEW",
      "timecodeStart": 8,
      "timecodeEnd": 60,
      "text": "<overview text>",
      "speakerNote": "<delivery direction>",
      "visualNote": "<visual: title card or key stat>",
      "isHookWindow": false
    }
  ],
  "estimatedDuration": 720,
  "wordCount": 1600
}`
}
