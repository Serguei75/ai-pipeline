/**
 * TtsProvider — Common interface for all TTS backends
 *
 * Implementations:
 *   KokoroProvider   — HuggingFace Kokoro-82M  (free, dev/test)
 *   PollyProvider    — Amazon Polly Neural      ($4/1M chars, prod standard)
 *   ResembleProvider — Resemble AI              ($5-19/mo, voice cloning)
 */

// ─── Voice metadata ──────────────────────────────────────────────────────────────────

export interface Voice {
  id: string
  name: string
  provider: string
  language: string           // BCP-47 code e.g. 'en-US'
  gender?: 'male' | 'female' | 'neutral'
  category?: 'premade' | 'cloned' | 'neural' | 'standard'
  previewUrl?: string
  tags?: string[]            // accent, age, use-case hints
}

// ─── Generation options ────────────────────────────────────────────────────────────

export interface TtsGenerateOpts {
  voiceId?: string
  stability?: number         // 0-1 (ElevenLabs / Resemble)
  speed?: number             // 0.5-2.0 speaking rate
  pitch?: number             // in semitones for Polly
  outputFormat?: 'mp3' | 'wav' | 'ogg'
}

export interface TtsGenerateResult {
  audioBuffer: Buffer
  contentType: string        // 'audio/mpeg' | 'audio/wav'
  characterCount: number
  estimatedCostUsd: number
  providerName: string
}

// ─── Provider interface ────────────────────────────────────────────────────────────

export interface TtsProvider {
  /** Unique provider name (e.g. 'kokoro-hf', 'amazon-polly', 'resemble-ai') */
  readonly name: string

  /** USD cost per 1 000 characters. 0 = free tier / self-hosted. */
  readonly costPer1kChars: number

  /** Whether this provider supports custom voice cloning */
  readonly supportsCloning: boolean

  /** Generate audio from text. Returns Buffer with audio data. */
  generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult>

  /** List available voices for this provider */
  listVoices(): Promise<Voice[]>

  /** Estimate cost in USD for a given character count */
  estimateCost(chars: number): number
}

// ─── Routing types ──────────────────────────────────────────────────────────────────

export type RoutingMode    = 'dev' | 'prod' | 'clone'
export type QualityTier    = 'free' | 'economy' | 'standard' | 'premium'

export interface RoutingOpts {
  mode?:    RoutingMode
  quality?: QualityTier
  clone?:   boolean    // needs voice cloning?
  lang?:    string     // BCP-47 language hint
}
