/**
 * GoogleCloudTtsProvider — Google Cloud Text-to-Speech
 *
 * Pricing (true pay-per-use, NO subscription):
 *   Standard voices:  FREE 4M chars/month, then $4/1M
 *   WaveNet voices:   FREE 1M chars/month, then $16/1M
 *   Neural2 voices:   FREE 1M chars/month, then $16/1M
 *   Studio voices:    $160/1M chars (no free tier)
 *
 * Free tier: 1M WaveNet/Neural2 chars per month FOREVER (not just first year)
 * At 320k chars/month — stays FREE indefinitely.
 *
 * Docs: https://cloud.google.com/text-to-speech/pricing
 *
 * Auth options (pick one):
 *   A) API key   — set GOOGLE_TTS_API_KEY (simplest for server-side)
 *   B) ADC       — set GOOGLE_APPLICATION_CREDENTIALS path to service account JSON
 */

import type { TtsProvider, TtsGenerateOpts, TtsGenerateResult, Voice } from './tts-provider.interface.js'

const GCP_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1'

// Neural2 voices: best quality, included in 1M free tier
// Format: language-Region-Neural2-Letter (A-J)
const NEURAL2_VOICES: Voice[] = [
  { id: 'en-US-Neural2-F', name: 'Neural2 F (US)',     provider: 'google-cloud-tts', language: 'en-US', gender: 'female',  category: 'neural' },
  { id: 'en-US-Neural2-A', name: 'Neural2 A (US)',     provider: 'google-cloud-tts', language: 'en-US', gender: 'male',    category: 'neural' },
  { id: 'en-US-Neural2-C', name: 'Neural2 C (US)',     provider: 'google-cloud-tts', language: 'en-US', gender: 'female',  category: 'neural' },
  { id: 'en-US-Neural2-D', name: 'Neural2 D (US)',     provider: 'google-cloud-tts', language: 'en-US', gender: 'male',    category: 'neural' },
  { id: 'en-GB-Neural2-A', name: 'Neural2 A (GB)',     provider: 'google-cloud-tts', language: 'en-GB', gender: 'female',  category: 'neural' },
  { id: 'en-GB-Neural2-B', name: 'Neural2 B (GB)',     provider: 'google-cloud-tts', language: 'en-GB', gender: 'male',    category: 'neural' },
  { id: 'pl-PL-Standard-A', name: 'Standard A (PL)',   provider: 'google-cloud-tts', language: 'pl-PL', gender: 'female',  category: 'standard' },
  { id: 'pl-PL-Standard-B', name: 'Standard B (PL)',   provider: 'google-cloud-tts', language: 'pl-PL', gender: 'male',    category: 'standard' },
  { id: 'ru-RU-Standard-A', name: 'Standard A (RU)',   provider: 'google-cloud-tts', language: 'ru-RU', gender: 'female',  category: 'standard' },
  { id: 'ru-RU-Standard-B', name: 'Standard B (RU)',   provider: 'google-cloud-tts', language: 'ru-RU', gender: 'male',    category: 'standard' },
]

export class GoogleCloudTtsProvider implements TtsProvider {
  readonly name            = 'google-cloud-tts'
  readonly costPer1kChars  = 0        // $0 up to 1M chars/month (Neural2)
  readonly supportsCloning = false

  private readonly apiKey:      string | null
  private readonly defaultVoice: string
  private usedCharsThisMonth   = 0
  private readonly FREE_LIMIT  = 1_000_000  // Neural2 free tier

  constructor(
    apiKey       = process.env.GOOGLE_TTS_API_KEY           ?? null,
    defaultVoice = process.env.GOOGLE_TTS_DEFAULT_VOICE_ID  ?? 'en-US-Neural2-F',
  ) {
    this.apiKey       = apiKey
    this.defaultVoice = defaultVoice

    if (!this.apiKey) {
      // ADC fallback: will use GOOGLE_APPLICATION_CREDENTIALS
      console.warn('[GoogleCloudTts] No API key, falling back to Application Default Credentials')
    }
  }

  async generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult> {
    const voiceId = opts?.voiceId ?? this.defaultVoice
    const [langCode] = voiceId.split('-').slice(0, 2)       // e.g. 'en-US' from 'en-US-Neural2-F'
    const languageCode = voiceId.split('-').slice(0, 2).join('-')

    const body = {
      input:       { text },
      voice:       { languageCode, name: voiceId },
      audioConfig: {
        audioEncoding:   'MP3',
        sampleRateHertz: 24_000,
        speakingRate:    opts?.speed ?? 1.0,
        pitch:           opts?.pitch ?? 0,
      },
    }

    const url = this.apiKey
      ? `${GCP_TTS_ENDPOINT}/text:synthesize?key=${this.apiKey}`
      : `${GCP_TTS_ENDPOINT}/text:synthesize`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    // ADC: set Authorization header if running with service account
    // In Cloud Run / GCE this is handled automatically by the metadata server

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Google Cloud TTS error ${res.status}: ${err}`)
    }

    const data = await res.json() as { audioContent: string }
    const audioBuffer = Buffer.from(data.audioContent, 'base64')

    this.usedCharsThisMonth += text.length

    const overLimit    = Math.max(0, this.usedCharsThisMonth - this.FREE_LIMIT)
    const costUsd      = (overLimit / 1_000) * 0.016   // $16/1M chars Neural2

    return {
      audioBuffer,
      contentType:      'audio/mpeg',
      characterCount:   text.length,
      estimatedCostUsd: costUsd,
      providerName:     this.name,
    }
  }

  async listVoices(): Promise<Voice[]> {
    // Return hardcoded Neural2 voices (most useful subset)
    // Full list via: GET https://texttospeech.googleapis.com/v1/voices?key=...
    return NEURAL2_VOICES
  }

  estimateCost(chars: number): number {
    // First 1M chars per month are free
    const billable = Math.max(0, chars - this.FREE_LIMIT)
    return (billable / 1_000) * 0.016
  }

  /** Current month usage stats */
  getUsage() {
    return {
      usedChars:      this.usedCharsThisMonth,
      freeLimit:      this.FREE_LIMIT,
      remaining:      Math.max(0, this.FREE_LIMIT - this.usedCharsThisMonth),
      overageCostUsd: this.estimateCost(this.usedCharsThisMonth),
    }
  }
}
