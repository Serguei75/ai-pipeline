/**
 * ElevenLabsService — ElevenLabs API v1 Wrapper
 *
 * Integrates OpenClaw skill: franciscoandsam/youtube-voice-summarizer-elevenlabs
 * Handles: TTS generation, voice listing, streaming audio, voice cloning.
 *
 * Supported models (2026):
 *   eleven_multilingual_v2  — best quality, 29 languages
 *   eleven_flash_v2_5       — fastest / cheapest (~50ms latency)
 *   eleven_turbo_v2_5       — balanced speed/quality
 */

import { createWriteStream, mkdirSync } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import path from 'path'

// ─── Constants ────────────────────────────────────────────────────────────────

export const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

export const MODELS = {
  MULTILINGUAL:  'eleven_multilingual_v2',
  FLASH:         'eleven_flash_v2_5',
  TURBO:         'eleven_turbo_v2_5',
  MONOLINGUAL:   'eleven_monolingual_v1',
} as const

export type ModelId = typeof MODELS[keyof typeof MODELS]

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: 'premade' | 'cloned' | 'generated' | 'professional'
  labels: Record<string, string>
  description: string | null
  preview_url: string | null
  available_for_tiers: string[]
  settings: VoiceSettings | null
}

export interface VoiceSettings {
  stability: number          // 0-1, higher = more consistent
  similarity_boost: number   // 0-1, higher = closer to original voice
  style: number              // 0-1, speaking style expressiveness
  use_speaker_boost: boolean // enhanced clarity
}

export interface TtsOptions {
  voiceId: string
  text: string
  model?: ModelId
  stability?: number
  similarityBoost?: number
  style?: number
  speakerBoost?: boolean
  outputFormat?: 'mp3_44100_128' | 'mp3_44100_192' | 'pcm_22050' | 'pcm_44100'
}

export interface TtsResult {
  audioBuffer: Buffer
  contentType: string
  characterCount: number
  model: string
  voiceId: string
}

export interface VoiceCloneOptions {
  name: string
  description?: string
  labels?: Record<string, string>
  files: Buffer[]   // audio sample buffers (mp3/wav, 1-25 files, <10MB each)
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ElevenLabsService {
  private readonly apiKey: string
  private readonly headers: Record<string, string>

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('ElevenLabs API key is required')
    this.apiKey = apiKey
    this.headers = {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  // ── List all available voices ────────────────────────────────────────────

  async listVoices(): Promise<ElevenLabsVoice[]> {
    const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error(`ElevenLabs listVoices failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { voices: ElevenLabsVoice[] }
    return data.voices
  }

  // ── Text-to-Speech: returns audio Buffer ──────────────────────────────

  async generateTts(opts: TtsOptions): Promise<TtsResult> {
    const model   = opts.model ?? MODELS.MULTILINGUAL
    const format  = opts.outputFormat ?? 'mp3_44100_128'

    const body = {
      text: opts.text,
      model_id: model,
      voice_settings: {
        stability:        opts.stability       ?? 0.5,
        similarity_boost: opts.similarityBoost ?? 0.75,
        style:            opts.style           ?? 0.0,
        use_speaker_boost: opts.speakerBoost   ?? true,
      },
    }

    const url = `${ELEVENLABS_BASE}/text-to-speech/${opts.voiceId}?output_format=${format}`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`ElevenLabs TTS failed: ${res.status} ${err}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    return {
      audioBuffer,
      contentType: res.headers.get('content-type') ?? 'audio/mpeg',
      characterCount: opts.text.length,
      model,
      voiceId: opts.voiceId,
    }
  }

  // ── Save audio buffer to disk ────────────────────────────────────────────

  async saveAudio(buffer: Buffer, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath)
    mkdirSync(dir, { recursive: true })
    const readable = Readable.from(buffer)
    const writable = createWriteStream(outputPath)
    await pipeline(readable, writable)
    return outputPath
  }

  // ── Quick preview (short text, flash model) ────────────────────────────

  async generatePreview(text: string, voiceId: string): Promise<Buffer> {
    const preview = text.slice(0, 200)
    const result = await this.generateTts({
      voiceId,
      text: preview,
      model: MODELS.FLASH,
      stability: 0.5,
      similarityBoost: 0.75,
    })
    return result.audioBuffer
  }

  // ── Clone voice from audio samples ─────────────────────────────────────

  async cloneVoice(opts: VoiceCloneOptions): Promise<ElevenLabsVoice> {
    const form = new FormData()
    form.append('name', opts.name)
    if (opts.description) form.append('description', opts.description)
    if (opts.labels) form.append('labels', JSON.stringify(opts.labels))
    opts.files.forEach((buf, i) => {
      form.append('files', new Blob([buf], { type: 'audio/mpeg' }), `sample_${i}.mp3`)
    })

    const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey },
      body: form,
    })
    if (!res.ok) throw new Error(`ElevenLabs cloneVoice failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<ElevenLabsVoice>
  }

  // ── Account subscription / usage info ───────────────────────────────

  async getUsage(): Promise<{ character_count: number; character_limit: number }> {
    const res = await fetch(`${ELEVENLABS_BASE}/user/subscription`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error(`ElevenLabs getUsage failed: ${res.status}`)
    return res.json()
  }
}
