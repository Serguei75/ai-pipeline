/**
 * BenchmarkerService — AI Hook Scoring vs Competitors
 *
 * Accepts our hook candidate + competitor DeconstructedVideo analysis.
 * Returns numeric score 0-100, grade, weaknesses and an AI-improved hook.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RankedHook, ScriptTemplate } from './deconstructor.service.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BenchmarkResult {
  score: number             // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  improvedHook: string      // AI-rewritten version using competitor patterns
  competitorBenchmarks: Array<{
    competitorHook: string
    competitorScore: number
    whyItWorks: string
  }>
}

export interface CompetitorContext {
  topHooks: RankedHook[]
  scriptTemplate: ScriptTemplate
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const BENCHMARK_PROMPT = (
  ourHook: string,
  ctx: CompetitorContext
) => {
  const topHighHooks = ctx.topHooks
    .filter((h) => h.effectiveness === 'High')
    .slice(0, 5)
    .map((h, i) => `${i + 1}. [${h.type}] "${h.text}"`)
    .join('\n')

  return `
You are a world-class YouTube hook copywriter and content strategist.

OUR HOOK TO EVALUATE:
"${ourHook}"

TOP COMPETITOR HOOKS (proven to perform well):
${topHighHooks || 'No high-performing hooks found in competitor analysis.'}

PROVEN SCRIPT TEMPLATE FROM COMPETITORS:
- Opening hook type: ${ctx.scriptTemplate.openingHookType}
- Emotional arc: ${ctx.scriptTemplate.emotionalArc.join(' → ') || 'Not specified'}
- Social proof used: ${ctx.scriptTemplate.proofStrategy.join(', ') || 'Not specified'}
- Urgency tactic: ${ctx.scriptTemplate.urgencyTactic}

Evaluate our hook against proven competitor patterns. Return ONLY this JSON:
{
  "score": 75,
  "grade": "B",
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "recommendations": ["actionable improvement 1", "actionable improvement 2"],
  "improvedHook": "rewritten hook applying the top competitor patterns",
  "competitorBenchmarks": [
    { "competitorHook": "exact competitor hook text", "competitorScore": 90, "whyItWorks": "clear explanation" }
  ]
}

Score rubric:
  90-100 — Viral potential, uses proven patterns perfectly
  70-89  — Good hook, minor improvements needed
  50-69  — Mediocre, significant improvements needed
  30-49  — Weak, needs major rework
  0-29   — Does not function as a hook, rewrite completely

Return ONLY valid JSON, no markdown fences.
`
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class BenchmarkerService {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor(apiKey: string) {
    const ai = new GoogleGenerativeAI(apiKey)
    this.model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
  }

  async benchmark(
    ourHook: string,
    competitorContext: CompetitorContext
  ): Promise<BenchmarkResult> {
    const prompt = BENCHMARK_PROMPT(ourHook, competitorContext)
    const res = await this.model.generateContent(prompt)
    return JSON.parse(res.response.text()) as BenchmarkResult
  }
}
