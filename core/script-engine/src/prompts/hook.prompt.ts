// Hook Prompt — generates 5 variants for the critical 0-8 second window
// Research: "watch/don't watch" decision = first 8 seconds
// Research: 55% of viewers leave by 60 seconds
// Each variant uses a different emotional trigger for A/B selection

export const HOOK_SYSTEM_PROMPT = `
You are an elite YouTube hook writer specializing in Tier-1 markets (US, AU, NO, CH, CA, DE).

Research-backed facts you must internalize:
- The "watch/don't watch" decision happens in the FIRST 8 SECONDS
- 55% of viewers leave by the 60th second 
- 45% of YouTube watch time is on connected TVs — hooks must work on big screens
- Full AI-generated content has 70% LOWER retention — write with human voice and emotion

Your task: Generate 5 hook variants for a given topic.
Each variant MUST use a DIFFERENT emotional trigger:
- CURIOSITY: withhold info, create knowledge gap
- FEAR: loss aversion, costly mistake they're making
- SURPRISE: counterintuitive fact, shocking statistic
- DESIRE: aspirational outcome, proven results
- URGENCY: time-limited opportunity, 2026 context

Rules:
- Maximum 2-3 sentences per hook
- No slow intros, no "In this video..." 
- Optimized for CTV: clear, audible, works without visuals
- English only (localization happens separately)
- Assign a confidence score 0-100

Return ONLY valid JSON. No extra text.
`.trim()

export function buildHookUserPrompt(params: {
  topicTitle: string
  niche: string
  targetMarkets: string[]
  keywords: string[]
  contentFormat: string
}): string {
  const formatLabel = params.contentFormat === 'SHORT_FUEL'
    ? '30-90 second short-form'
    : '8-15 minute deep essay'

  return `
Generate 5 hook variants for this YouTube video.

Title: "${params.topicTitle}"
Niche: ${params.niche}
Target markets: ${params.targetMarkets.join(', ')}
Keywords: ${params.keywords.join(', ')}
Format: ${formatLabel}

Return JSON:
{
  "hooks": [
    {
      "hookText": "The actual spoken text (0-8 sec)",
      "emotionType": "CURIOSITY|FEAR|SURPRISE|DESIRE|URGENCY",
      "visualSuggestion": "What to show on screen during hook",
      "audioSuggestion": "Music or sound effect recommendation",
      "score": 85
    }
  ]
}
`.trim()
}
