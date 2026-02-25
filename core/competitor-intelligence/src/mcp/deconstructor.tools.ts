/**
 * Deconstructor MCP Tools
 * 3 new tools exposed to NanoBot via Model Context Protocol:
 *
 *   deconstruct_competitor_video  — full Gemini analysis → 10 marketing dimensions
 *   transcribe_youtube_video      — YouTube URL → timestamped transcript
 *   benchmark_hooks               — score our hook vs competitor analysis (0-100)
 *
 * Pattern follows the same McpTool interface used in ../mcp-tools.ts
 */

import type { McpTool } from '../../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3009}`
const j = (r: Response) => r.json()
const post = (path: string, body: unknown) =>
  j(fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))

export const deconstructorTools: McpTool[] = [
  // ── 1. deconstruct_competitor_video ────────────────────────────────────────
  {
    name: 'deconstruct_competitor_video',
    description:
      'Full AI-powered deconstruction of a competitor YouTube video into 10 marketing dimensions. ' +
      'Returns: spoken/visual/text hooks with effectiveness scores, social proof elements, ' +
      'urgency tactics, emotional triggers, problem-solution arc, CTA analysis, target audience, ' +
      'unique mechanism, plus a ranked hook list and script template ready for script-engine. ' +
      'Use when: analyzing competitor videos, generating creative briefs, understanding viral patterns.',
    schema: {
      properties: {
        videoUrl: {
          type: 'string',
          description: 'Full YouTube video URL (e.g. https://youtube.com/watch?v=xxx) or bare video ID',
        },
      },
      required: ['videoUrl'],
    },
    handler: async (args) => post('/deconstructor/analyze', args),
  },

  // ── 2. transcribe_youtube_video ────────────────────────────────────────────
  {
    name: 'transcribe_youtube_video',
    description:
      'Extract full transcript with timestamps from a YouTube video. ' +
      'Returns the complete spoken text split into timed segments (offset + duration in ms). ' +
      'Use when: you need the raw transcript before deeper analysis, ' +
      'or when summarising a video without full marketing analysis.',
    schema: {
      properties: {
        videoUrl: {
          type: 'string',
          description: 'Full YouTube URL or bare video ID',
        },
        lang: {
          type: 'string',
          description: 'Preferred transcript language code (default: en). Falls back if unavailable.',
          default: 'en',
        },
      },
      required: ['videoUrl'],
    },
    handler: async (args) => post('/deconstructor/transcribe', args),
  },

  // ── 3. benchmark_hooks ─────────────────────────────────────────────────────
  {
    name: 'benchmark_hooks',
    description:
      'Score our hook candidate (0-100) against proven competitor hooks from a ' +
      'prior deconstruct_competitor_video call. ' +
      'Returns: numeric score, letter grade (A-F), strengths, weaknesses, ' +
      'specific recommendations, and an AI-rewritten improved hook. ' +
      'Use after generating a script hook and before proceeding to voice/media production. ' +
      'Rule: only proceed to production if score >= 70.',
    schema: {
      properties: {
        ourHook: {
          type: 'string',
          description: 'The hook text we want to evaluate (first 1-3 sentences of our script)',
        },
        competitorAnalysis: {
          type: 'object',
          description:
            'The full JSON object returned by a previous deconstruct_competitor_video call ' +
            '(must contain topHooks[] and scriptTemplate fields)',
        },
      },
      required: ['ourHook', 'competitorAnalysis'],
    },
    handler: async (args) => post('/deconstructor/benchmark', args),
  },
]
