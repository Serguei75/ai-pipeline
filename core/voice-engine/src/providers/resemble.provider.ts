/**
 * ResembleProvider — Resemble AI (Voice Cloning + TTS)
 *
 * Plans:
 *   Starter  $5/mo  — 4 000 sec/mo (~66 min),  1 quick clone
 *   Creator  $19/mo — 15 000 sec/mo (~250 min), 3 quick + 1 pro clone
 *
 * Use: Brand voice, client voice cloning, custom persona
 *
 * Required env:
 *   RESEMBLE_API_TOKEN         (from app.resemble.ai → Settings → API)
 *   RESEMBLE_PROJECT_UUID      (project to create clips in)
 *   RESEMBLE_DEFAULT_VOICE_UUID (default voice for generation)
 */

import type { TtsProvider, TtsGenerateOpts, TtsGenerateResult, Voice } from './tts-provider.interface.js'

const RESEMBLE_API = 'https://app.resemble.ai/api/v2'

// Estimated: ~$5/4000 sec = $0.00125/sec, ~150 chars/sec speech rate
const COST_PER_1K_CHARS = (0.00125 * 150) / 1    // ~$0.1875/1k chars at $5 starter
const COST_PER_1K_CHARS_CREATOR = (19 / (15_000 * 150)) * 1_000  // ~$0.008/1k chars

export class ResembleProvider implements TtsProvider {
  readonly name            = 'resemble-ai'
  readonly supportsCloning = true
  readonly costPer1kChars  = COST_PER_1K_CHARS_CREATOR  // use Creator plan estimate

  private readonly apiToken:     string
  private readonly projectUuid:  string
  private readonly defaultVoice: string

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Token token="${this.apiToken}"`,
      'Content-Type':  'application/json',
    }
  }

  constructor(
    apiToken     = process.env.RESEMBLE_API_TOKEN          ?? '',
    projectUuid  = process.env.RESEMBLE_PROJECT_UUID        ?? '',
    defaultVoice = process.env.RESEMBLE_DEFAULT_VOICE_UUID  ?? '',
  ) {
    this.apiToken     = apiToken
    this.projectUuid  = projectUuid
    this.defaultVoice = defaultVoice
  }

  // ── Generate via streaming endpoint (synchronous audio return) ──────────────

  async generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult> {
    if (!this.apiToken)    throw new Error('RESEMBLE_API_TOKEN not set')
    if (!this.projectUuid) throw new Error('RESEMBLE_PROJECT_UUID not set')

    const voiceUuid = opts?.voiceId ?? this.defaultVoice
    if (!voiceUuid) throw new Error('voiceId required for ResembleProvider (no default configured)')

    const res = await fetch(`${RESEMBLE_API}/stream`, {
      method: 'POST',
      headers: { ...this.authHeaders, Accept: 'audio/wav' },
      body: JSON.stringify({
        project_uuid:  this.projectUuid,
        voice_uuid:    voiceUuid,
        body:          text,
        output_format: 'wav',
        precision:     'FULL',
        sample_rate:   44_100,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resemble stream failed ${res.status}: ${err}`)
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer())

    return {
      audioBuffer,
      contentType:      'audio/wav',
      characterCount:   text.length,
      estimatedCostUsd: this.estimateCost(text.length),
      providerName:     this.name,
    }
  }

  // ── List voices in this project ──────────────────────────────────────────

  async listVoices(): Promise<Voice[]> {
    if (!this.apiToken) return []

    const res = await fetch(`${RESEMBLE_API}/voices?page=1&page_size=50`, {
      headers: this.authHeaders,
    })
    if (!res.ok) throw new Error(`Resemble listVoices failed: ${res.status}`)

    const data = await res.json() as {
      items: Array<{ uuid: string; name: string; language?: string; gender?: string }>
    }

    return (data.items ?? []).map((v) => ({
      id:       v.uuid,
      name:     v.name,
      provider: this.name,
      language: v.language ?? 'en-US',
      gender:   (v.gender as Voice['gender']) ?? 'neutral',
      category: 'cloned' as const,
    }))
  }

  // ── Clone voice from audio file URLs ───────────────────────────────────

  async cloneVoice(name: string, description: string): Promise<{ voiceUuid: string }> {
    const res = await fetch(`${RESEMBLE_API}/voices`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) throw new Error(`Resemble cloneVoice failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { item: { uuid: string } }
    return { voiceUuid: data.item.uuid }
  }

  estimateCost(chars: number): number {
    return (chars / 1_000) * this.costPer1kChars
  }
}
