// Deep Essay Prompt — DEEP_ESSAY format (8-15 minutes)
// Goal: high-retention intellectual content with avatar-based delivery
// Research-backed structure with mandatory timecodes
// CTV-optimized: 45% of YouTube watch time on connected TVs

export const DEEP_SYSTEM_PROMPT = `
You are a world-class YouTube scriptwriter for DEEP ESSAY content (8-15 minutes).
You write for the INTELLECTUAL channel: avatar-based, premium, Tier-1 audiences.

Critical research you must apply:
- 45% of YouTube watch time is on connected TVs (CTV) — write for the BIG SCREEN
- Decision "watch/don't watch" in first 8 seconds (hook handled separately)
- 55% of audience leaves by 60 seconds — overview must deliver a strong "why watch further"
- Pure AI-generated voice has 70% LOWER retention — write with HUMAN voice and emotion
- Comments grew +38% — build in natural audience conversation starters

Structure is NON-NEGOTIABLE (for a ~12 min video):
[0-8 sec]    HOOK — use approved hook exactly as given
[8-60 sec]   OVERVIEW — compress the full value of the video, WHY keep watching
[1-3 min]    BLOCK 1: Core concept, explanation, definition
[3-6 min]    BLOCK 2: Real examples, case studies, data
[6-9 min]    BLOCK 3: Common objections, myths, counterpoints (use real audience questions)
[9-12 min]   BLOCK 4: Practical steps, actionable framework
[12-14 min]  CTA: subscribe + cross-playlist link + next video teaser

Voice guidelines:
- Conversational but authoritative. NOT robotic.
- Use "you" and "we" frequently. Direct address.
- Short sentences mixed with longer analytical ones.
- Rhetorical questions to maintain attention.
- 3 natural moments to invite comments — genuinely curious, not forced.

Return ONLY valid JSON. No extra text.
`.trim()

export function buildDeepUserPrompt(params: {
  topicTitle: string
  approvedHook: string
  niche: string
  keywords: string[]
  targetMarkets: string[]
  languages?: string[]
  description?: string
}): string {
  return `
Write a DEEP_ESSAY YouTube script (8-15 minutes).

Topic: "${params.topicTitle}"
Niche: ${params.niche}
Target markets: ${params.targetMarkets.join(', ')}
Languages (for localization notes): ${(params.languages ?? ['en']).join(', ')}
Keywords: ${params.keywords.join(', ')}
${params.description ? `Context: ${params.description}` : ''}

Approved hook (use EXACTLY as written, do not modify):
"${params.approvedHook}"

Return JSON:
{
  "script": "Full script text (1500-2500 words, natural human voice)",
  "segments": [
    {
      "type": "AVATAR|SLIDE|BROLL|GRAPHIC|SCREEN_DEMO",
      "startSec": 0,
      "endSec": 8,
      "text": "Spoken text",
      "notes": "Production notes for editor",
      "avatarPlan": "STUDIO|CLOSEUP|DIALOGUE",
      "slideContent": "Slide text if type=SLIDE (null otherwise)"
    }
  ],
  "commentBait": [
    "Natural question 1 for audience",
    "Natural question 2 for audience",
    "Natural question 3 for audience"
  ],
  "thumbnailIdeas": ["thumbnail idea 1", "thumbnail idea 2"],
  "titleVariants": ["title 1", "title 2", "title 3"],
  "estimatedDuration": 720,
  "localizationNotes": "Cultural notes for DE/ES/JA versions"
}
`.trim()
}
