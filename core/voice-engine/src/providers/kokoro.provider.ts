/**
 * KokoroProvider — HuggingFace Kokoro-82M
 *
 * Model:  hexgrad/Kokoro-82M (Apache 2.0)
 * Cost:   FREE (HF Inference API free tier, or self-hosted)
 * Use:    Dev, testing, CI, rapid iteration
 *
 * Voices: af_bella, af_sarah, am_adam, am_michael, bf_emma, bm_george
 * Langs:  EN, JA, ZH, KO, FR, ES (82M model)
 */

import type { TtsProvider, TtsGenerateOpts, TtsGenerateResult, Voice } from './tts-provider.interface.js'

const HF_API = 'https://api-inference.huggingface.co/models'

// Hardcoded Kokoro voice list (model has built-in voice embeddings)
const KOKORO_VOICES: Voice[] = [
  { id: 'af_bella',   name: 'Bella',   provider: 'kokoro-hf', language: 'en-US', gender: 'female', category: 'premade', tags: ['warm', 'natural'] },
  { id: 'af_sarah',   name: 'Sarah',   provider: 'kokoro-hf', language: 'en-US', gender: 'female', category: 'premade', tags: ['professional'] },
  { id: 'am_adam',    name: 'Adam',    provider: 'kokoro-hf', language: 'en-US', gender: 'male',   category: 'premade', tags: ['deep', 'authoritative'] },
  { id: 'am_michael', name: 'Michael', provider: 'kokoro-hf', language: 'en-US', gender: 'male',   category: 'premade', tags: ['casual', 'friendly'] },
  { id: 'bf_emma',    name: 'Emma',    provider: 'kokoro-hf', language: 'en-GB', gender: 'female', category: 'premade', tags: ['british', 'clear'] },
  { id: 'bm_george',  name: 'George',  provider: 'kokoro-hf', language: 'en-GB', gender: 'male',   category: 'premade', tags: ['british', 'narrator'] },
]

export class KokoroProvider implements TtsProvider {
  readonly name             = 'kokoro-hf'
  readonly costPer1kChars   = 0       // free
  readonly supportsCloning  = false

  private readonly model: string
  private readonly hfToken: string

  constructor(
    model   = process.env.KOKORO_MODEL    ?? 'hexgrad/Kokoro-82M',
    hfToken = process.env.HF_API_TOKEN    ?? ''
  ) {
    this.model    = model
    this.hfToken  = hfToken
  }

  async generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult> {
    const voiceId = opts?.voiceId ?? 'af_bella'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.hfToken) headers['Authorization'] = `Bearer ${this.hfToken}`

    const body = JSON.stringify({
      inputs: text,
      parameters: { voice: voiceId },
      options: { wait_for_model: true },
    })

    const res = await fetch(`${HF_API}/${this.model}`, {
      method: 'POST',
      headers,
      body,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Kokoro HF API error ${res.status}: ${err}`)
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'audio/flac'

    return {
      audioBuffer,
      contentType,
      characterCount:    text.length,
      estimatedCostUsd:  0,
      providerName:      this.name,
    }
  }

  async listVoices(): Promise<Voice[]> {
    return KOKORO_VOICES
  }

  estimateCost(_chars: number): number {
    return 0
  }
}
