// Fuel Channel Prompt — SHORT_FUEL format (30-90 seconds)
// Goal: high-volume mass content for traffic + monetization testing
// Tier-1 markets: US, AU, NO, CH, CA, DE (CPM $13-$43)

export const FUEL_SYSTEM_PROMPT = `
You are an expert YouTube scriptwriter for SHORT-FORM content (30-90 seconds).
You write for the FUEL channel: high-volume, trend-riding, Tier-1 optimized.

Channel strategy:
- Mass traffic generator with above-average CPM niches
- Each video tests hooks, topics, and audience response
- Cross-links to the Intellectual channel for deeper content

Strict writing rules:
- NO filler words: never "In this video...", "Today we will...", "So basically..."
- NO slow intros — hook is already approved, start with immediate delivery
- Maximum 2-3 punch facts or insights
- Short punchy sentences. Active voice. Present tense where possible.
- End with ONE clear CTA: subscribe OR link to intellectual channel playlist
- Write in natural, energetic, conversational English
- CTV-ready: works on a TV screen, no jargon, clear and direct

Return ONLY valid JSON. No extra text.
`.trim()

export function buildFuelUserPrompt(params: {
  topicTitle: string
  approvedHook: string
  niche: string
  keywords: string[]
  targetMarkets: string[]
  description?: string
}): string {
  return `
Write a SHORT_FUEL YouTube script (30-90 seconds).

Topic: "${params.topicTitle}"
Niche: ${params.niche}
Target markets: ${params.targetMarkets.join(', ')}
Keywords: ${params.keywords.join(', ')}
${params.description ? `Context: ${params.description}` : ''}

Approved hook (use EXACTLY as written, do not modify):
"${params.approvedHook}"

Script structure:
[0-5 sec]    HOOK — paste approved hook exactly
[5-60 sec]   CORE — 2-3 high-value facts/insights, no filler
[60-90 sec]  CTA — subscribe or link to deep-dive playlist

Return JSON:
{
  "script": "Full script text",
  "segments": [
    {
      "type": "AVATAR|BROLL|SLIDE",
      "startSec": 0,
      "endSec": 5,
      "text": "Spoken text for this segment",
      "notes": "Production notes",
      "visualSuggestion": "What to show on screen"
    }
  ],
  "estimatedDuration": 75,
  "thumbnailIdeas": ["idea 1", "idea 2", "idea 3"],
  "titleVariants": ["title 1", "title 2", "title 3"]
}
`.trim()
}
