/**
 * FishAudioProvider — Fish Audio TTS + Voice Cloning
 *
 * Pricing (true pay-per-use, NO subscription, NO minimum):
 *   TTS synthesis: $15 per 1M UTF-8 bytes of output audio (approx.)
 *   Voice cloning: included in the per-use pricing
 *   Free credits:  new accounts get trial credits
 *
 * Docs: https://docs.fish.audio
 * API:  https://api.fish.audio/v1
 *
 * Models:
 *   speech-1.6   — latest, best quality + speed
 *   speech-1.5   — stable, multilingual
 *
 * Voice cloning:
 *   Upload reference audio → get model_id → use as reference_id in TTS
 *   No extra charge beyond per-use TTS pricing.
 *
 * Required env:
 *   FISH_AUDIO_API_KEY          (from fish.audio → Settings → API)
 *   FISH_AUDIO_DEFAULT_MODEL_ID (optional, voice model for generation)
 */

import type { TtsProvider, TtsGenerateOpts, TtsGenerateResult, Voice } from './tts-provider.interface.js'

const FISH_API = 'https://api.fish.audio/v1'

// Fish Audio built-in voices (subset, full list from /model endpoint)
const FISH_BUILTIN_VOICES: Voice[] = [
  { id: 'default',  name: 'Default (Auto)', provider: 'fish-audio', language: 'en-US', gender: 'neutral',  category: 'premade' },
]

export interface FishCloneOptions {
  name:        string
  description?: string
  audioBuffers: Buffer[]    // reference audio samples (mp3/wav)
  language?:   string       // 'en', 'zh', 'ja', etc.
}

export class FishAudioProvider implements TtsProvider {
  readonly name            = 'fish-audio'
  readonly costPer1kChars  = 0.015   // ~$15/1M bytes ≈ $0.015/1k chars
  readonly supportsCloning = true

  private readonly apiKey:       string
  private readonly defaultModel: string | null

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type':  'application/json',
    }
  }

  constructor(
    apiKey       = process.env.FISH_AUDIO_API_KEY          ?? '',
    defaultModel = process.env.FISH_AUDIO_DEFAULT_MODEL_ID ?? null,
  ) {
    this.apiKey       = apiKey
    this.defaultModel = defaultModel
  }

  // ── TTS generation ──────────────────────────────────────────────────

  async generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult> {
    if (!this.apiKey) throw new Error('FISH_AUDIO_API_KEY not set')

    const referenceId = opts?.voiceId ?? this.defaultModel

    const body: Record<string, unknown> = {
      text,
      format:      'mp3',
      mp3_bitrate: 128,
      normalize:   true,
      latency:     'normal',     // 'normal' | 'balanced' (faster, lower quality)
    }

    if (referenceId) body['reference_id'] = referenceId

    const res = await fetch(`${FISH_API}/tts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Fish Audio TTS error ${res.status}: ${err}`)
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer())

    return {
      audioBuffer,
      contentType:      'audio/mpeg',
      characterCount:   text.length,
      estimatedCostUsd: this.estimateCost(text.length),
      providerName:     this.name,
    }
  }

  // ── List user voices (cloned models) ─────────────────────────────────────

  async listVoices(): Promise<Voice[]> {
    if (!this.apiKey) return FISH_BUILTIN_VOICES

    const res = await fetch(`${FISH_API}/model?page_size=50&page_number=1`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error(`Fish Audio listVoices failed: ${res.status}`)

    const data = await res.json() as {
      items: Array<{ _id: string; title: string; languages: string[] }>
    }

    const userVoices: Voice[] = (data.items ?? []).map((v) => ({
      id:       v._id,
      name:     v.title,
      provider: this.name,
      language: v.languages?.[0] ?? 'en',
      category: 'cloned' as const,
    }))

    return [...FISH_BUILTIN_VOICES, ...userVoices]
  }

  // ── Clone voice from audio buffers ─────────────────────────────────────

  async cloneVoice(opts: FishCloneOptions): Promise<{ modelId: string }> {
    if (!this.apiKey) throw new Error('FISH_AUDIO_API_KEY not set')

    const form = new FormData()
    form.append('title',       opts.name)
    if (opts.description) form.append('description', opts.description)
    if (opts.language)    form.append('languages',   JSON.stringify([opts.language]))

    opts.audioBuffers.forEach((buf, i) => {
      form.append(
        'voices',
        new Blob([buf], { type: 'audio/mpeg' }),
        `sample_${i}.mp3`
      )
    })

    const res = await fetch(`${FISH_API}/model`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: form,
    })

    if (!res.ok) throw new Error(`Fish Audio cloneVoice failed: ${res.status} ${await res.text()}`)

    const data = await res.json() as { _id: string }
    return { modelId: data._id }
  }

  estimateCost(chars: number): number {
    return (chars / 1_000) * this.costPer1kChars
  }
}
