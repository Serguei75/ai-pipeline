/**
 * DeconstructorService — AI Video Marketing Analysis
 *
 * Integrates OpenClaw skill: fortytwode/meta-video-ad-deconstructor
 * TypeScript port using @google/generative-ai SDK.
 *
 * Input:  TranscriptResult (from TubescribeService)
 * Output: DeconstructedVideo — 10 marketing dimensions as structured JSON
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { TubescribeService, type TranscriptResult } from './tubescribe.service.js'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface HookElement {
  hookText: string
  timestamp: string
  hookType: string       // 'Problem Question' | 'Shocking Stat' | 'Bold Claim' | …
  effectiveness: string  // 'High - reason' | 'Medium - reason' | 'Low - reason'
}

export interface SocialProofElement {
  proofType: string        // 'User Count' | 'Testimonial' | 'Expert Quote' | …
  claim: string
  credibilityScore: number // 1-10
}

export interface EmotionalTrigger {
  triggerType: string   // 'Fear' | 'Desire' | 'Curiosity' | 'Belonging' | …
  evidence: string
  intensity: string     // 'High' | 'Medium' | 'Low'
}

export interface DeconstructedDimensions {
  spokenHooks:       { elements: HookElement[] }
  visualHooks:       { elements: Array<{ description: string; timestamp: string; effectiveness: string }> }
  textHooks:         { elements: Array<{ text: string; timestamp: string; type: string }> }
  socialProof:       { elements: SocialProofElement[] }
  urgencyScarcity:   { elements: Array<{ tactic: string; claim: string; urgencyLevel: string }> }
  emotionalTriggers: { elements: EmotionalTrigger[] }
  problemSolution:   { painPoint: string; solution: string; bridge: string }
  ctaAnalysis:       { primaryCta: string; ctaTiming: string; effectiveness: string; alternatives: string[] }
  targetAudience:    { primary: string; psychographics: string[]; painPoints: string[] }
  uniqueMechanism:   { claim: string; proof: string; differentiation: string }
}

export interface VideoSummary {
  product: string
  keyFeatures: string[]
  targetAudience: string
  callToAction: string
  contentType: 'educational' | 'promotional' | 'entertainment' | 'hybrid'
}

export interface RankedHook {
  text: string
  type: string
  effectiveness: 'High' | 'Medium' | 'Low'
  timestamp: string
  source: 'spoken' | 'visual' | 'text'
}

export interface ScriptTemplate {
  openingHookType: string
  emotionalArc: string[]
  proofStrategy: string[]
  urgencyTactic: string
  ctaStyle: string
}

export interface DeconstructedVideo {
  videoId: string
  videoUrl: string
  summary: VideoSummary
  dimensions: DeconstructedDimensions
  topHooks: RankedHook[]
  scriptTemplate: ScriptTemplate
  analyzedAt: string
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SUMMARY_PROMPT = (transcript: string) => `
You are an expert video marketing analyst. Analyze this transcript and return a JSON summary.

TRANSCRIPT:
${transcript.slice(0, 8_000)}

Return ONLY this JSON (no markdown, no explanation):
{
  "product": "product/topic/service name",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "targetAudience": "specific audience description",
  "callToAction": "main CTA",
  "contentType": "educational|promotional|entertainment|hybrid"
}
`

const DIMENSIONS_PROMPT = (formatted: string, summary: VideoSummary) => `
You are an expert marketing strategist. Deconstruct all marketing dimensions from this video.

SUMMARY: ${JSON.stringify(summary)}

TIMESTAMPED TRANSCRIPT:
${formatted}

Return ONLY this JSON structure (no markdown):
{
  "spokenHooks": { "elements": [
    { "hookText": "exact quote", "timestamp": "0:00",
      "hookType": "Problem Question|Shocking Stat|Bold Claim|Story Opening|Curiosity Gap",
      "effectiveness": "High|Medium|Low - reason" }
  ]},
  "visualHooks": { "elements": [
    { "description": "visual element", "timestamp": "0:00", "effectiveness": "High|Medium|Low - reason" }
  ]},
  "textHooks": { "elements": [
    { "text": "on-screen text", "timestamp": "0:00", "type": "Title Card|Lower Third|Overlay|CTA Button" }
  ]},
  "socialProof": { "elements": [
    { "proofType": "User Count|Testimonial|Expert Quote|Award|Statistics|Case Study",
      "claim": "exact claim", "credibilityScore": 8 }
  ]},
  "urgencyScarcity": { "elements": [
    { "tactic": "Limited Time|Limited Stock|Price Increase|FOMO", "claim": "exact claim", "urgencyLevel": "High|Medium|Low" }
  ]},
  "emotionalTriggers": { "elements": [
    { "triggerType": "Fear|Desire|Curiosity|Belonging|Pride|Relief|Excitement",
      "evidence": "quote or description", "intensity": "High|Medium|Low" }
  ]},
  "problemSolution": {
    "painPoint": "core problem", "solution": "solution presented", "bridge": "connection"
  },
  "ctaAnalysis": {
    "primaryCta": "main CTA", "ctaTiming": "timestamp",
    "effectiveness": "assessment", "alternatives": []
  },
  "targetAudience": {
    "primary": "audience", "psychographics": [], "painPoints": []
  },
  "uniqueMechanism": {
    "claim": "unique claim", "proof": "how proved", "differentiation": "vs competitors"
  }
}

If info is absent in transcript, use empty arrays or "Not specified".
Return ONLY valid JSON.
`

// ─── Service ──────────────────────────────────────────────────────────────────

export class DeconstructorService {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
  private tubescribe = new TubescribeService()

  constructor(apiKey: string) {
    const ai = new GoogleGenerativeAI(apiKey)
    this.model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async deconstructFromUrl(
    videoUrl: string,
    onProgress?: (step: string, pct: number) => void
  ): Promise<DeconstructedVideo> {
    onProgress?.('Fetching transcript', 10)
    const transcript = await this.tubescribe.transcribe(videoUrl)

    onProgress?.('Generating summary', 30)
    const summary = await this.generateSummary(transcript)

    onProgress?.('Analyzing 10 marketing dimensions', 50)
    const dimensions = await this.analyzeDimensions(transcript, summary)

    onProgress?.('Ranking hooks & building script template', 85)
    const topHooks = this.rankHooks(dimensions)
    const scriptTemplate = this.deriveTemplate(dimensions)

    onProgress?.('Done', 100)

    return {
      videoId: transcript.videoId,
      videoUrl: transcript.videoUrl,
      summary,
      dimensions,
      topHooks,
      scriptTemplate,
      analyzedAt: new Date().toISOString(),
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async generateSummary(t: TranscriptResult): Promise<VideoSummary> {
    const res = await this.model.generateContent(SUMMARY_PROMPT(t.fullText))
    return JSON.parse(res.response.text()) as VideoSummary
  }

  private async analyzeDimensions(
    t: TranscriptResult,
    summary: VideoSummary
  ): Promise<DeconstructedDimensions> {
    const formatted = this.tubescribe.formatForAnalysis(t)
    const res = await this.model.generateContent(DIMENSIONS_PROMPT(formatted, summary))
    return JSON.parse(res.response.text()) as DeconstructedDimensions
  }

  private rankHooks(d: DeconstructedDimensions): RankedHook[] {
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
    const hooks: RankedHook[] = [
      ...d.spokenHooks.elements.map((h) => ({
        text: h.hookText,
        type: h.hookType,
        effectiveness: this.parseEff(h.effectiveness),
        timestamp: h.timestamp,
        source: 'spoken' as const,
      })),
      ...d.visualHooks.elements.map((h) => ({
        text: h.description,
        type: 'Visual',
        effectiveness: this.parseEff(h.effectiveness),
        timestamp: h.timestamp,
        source: 'visual' as const,
      })),
    ]
    return hooks.sort((a, b) => (order[a.effectiveness] ?? 2) - (order[b.effectiveness] ?? 2))
  }

  private deriveTemplate(d: DeconstructedDimensions): ScriptTemplate {
    return {
      openingHookType: d.spokenHooks.elements[0]?.hookType ?? 'Problem Question',
      emotionalArc:    d.emotionalTriggers.elements.map((t) => t.triggerType),
      proofStrategy:   d.socialProof.elements.map((p) => p.proofType),
      urgencyTactic:   d.urgencyScarcity.elements[0]?.tactic ?? 'Value Scarcity',
      ctaStyle:        d.ctaAnalysis.primaryCta,
    }
  }

  private parseEff(raw: string): 'High' | 'Medium' | 'Low' {
    if (raw.startsWith('High'))   return 'High'
    if (raw.startsWith('Medium')) return 'Medium'
    return 'Low'
  }
}
