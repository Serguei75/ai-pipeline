/**
 * TTS MCP Tools — 4 instruments for NanoBot
 *
 *   generate_voiceover   — script → ElevenLabs audio job (async)
 *   list_voices          — all available voices with metadata
 *   get_voice_preview    — instant short audio preview for a voice
 *   get_tts_usage        — ElevenLabs character usage this billing period
 */

import type { McpTool } from '../../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3003}`
const j    = (r: Response) => r.json()
const get  = (path: string)           => j(fetch(`${BASE}${path}`))
const post = (path: string, body: unknown) =>
  j(fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))

export const ttsTools: McpTool[] = [
  // ── 1. generate_voiceover ───────────────────────────────────────────────
  {
    name: 'generate_voiceover',
    description:
      'Generate a professional AI voiceover from a script using ElevenLabs TTS. ' +
      'Queues an async job and returns a jobId immediately. ' +
      'Poll get_voice_job to check status and get the audioUrl when DONE. ' +
      'Use after script-engine generates a script and before media-engine composes video. ' +
      'IMPORTANT: only pass text — no SSML markup, no emojis, no timestamps.',
    schema: {
      properties: {
        scriptText: {
          type: 'string',
          description: 'The full script text to convert to speech. Plain text only, no markdown.',
        },
        voiceId: {
          type: 'string',
          description:
            'ElevenLabs voice ID. Use list_voices to get available IDs. ' +
            'Default: Bella (EXAVITQu4vr4xnSDxMaL). ' +
            'Good defaults: Adam (pNInz6obpgDQGcFmaJgB), Rachel (21m00Tcm4TlvDq8ikWAM).',
        },
        model: {
          type: 'string',
          description: 'ElevenLabs model. Default: eleven_multilingual_v2 (best quality).',
          enum: ['eleven_multilingual_v2', 'eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_monolingual_v1'],
          default: 'eleven_multilingual_v2',
        },
        stability: {
          type: 'number',
          description: 'Voice stability 0-1. Higher = more consistent but less expressive. Default 0.5.',
          default: 0.5,
        },
        similarityBoost: {
          type: 'number',
          description: 'Similarity to original voice 0-1. Higher = closer. Default 0.75.',
          default: 0.75,
        },
      },
      required: ['scriptText'],
    },
    handler: async (args) => post('/tts/generate', args),
  },

  // ── 2. list_voices ─────────────────────────────────────────────────────────
  {
    name: 'list_voices',
    description:
      'List all available ElevenLabs voices including premade library and custom cloned voices. ' +
      'Returns voice_id, name, category, labels (accent, gender, age, use case), and preview_url. ' +
      'Use before generate_voiceover to pick the right voice for the content.',
    schema: { properties: {}, required: [] },
    handler: async () => get('/tts/voices'),
  },

  // ── 3. get_voice_preview ─────────────────────────────────────────────────
  {
    name: 'get_voice_preview',
    description:
      'Generate a short instant audio preview (~200 chars) for a specific voice. ' +
      'Uses the fast flash model. Returns base64-encoded MP3. ' +
      'Use to audition a voice before committing to a full generation job.',
    schema: {
      properties: {
        text: {
          type: 'string',
          description: 'Short sample text (max 200 chars) to preview with this voice.',
        },
        voiceId: {
          type: 'string',
          description: 'ElevenLabs voice ID to preview.',
        },
      },
      required: ['text', 'voiceId'],
    },
    handler: async (args) => post('/tts/preview', args),
  },

  // ── 4. get_tts_usage ─────────────────────────────────────────────────────────
  {
    name: 'get_tts_usage',
    description:
      'Get current ElevenLabs character usage for this billing period. ' +
      'Returns character_count used and character_limit. ' +
      'Use in Heartbeat monitoring to alert before quota exhaustion.',
    schema: { properties: {}, required: [] },
    handler: async () => get('/tts/usage'),
  },
]
