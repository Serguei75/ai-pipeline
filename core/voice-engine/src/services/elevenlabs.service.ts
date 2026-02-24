import { config } from '../config.js'
import { logger } from '../logger.js'

export interface TTSOptions {
  voiceId: string
  text: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  speakerBoost?: boolean
  speed?: number
}

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
}

export interface SubscriptionInfo {
  character_count: number
  character_limit: number
  can_extend_character_limit: boolean
}

export class ElevenLabsService {
  private readonly baseUrl = 'https://api.elevenlabs.io/v1'
  private readonly apiKey: string

  constructor() {
    this.apiKey = config.ELEVENLABS_API_KEY
  }

  private get authHeaders(): Record<string, string> {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  async textToSpeech(opts: TTSOptions): Promise<Buffer> {
    const url = `${this.baseUrl}/text-to-speech/${opts.voiceId}`

    const body = {
      text: opts.text,
      model_id: opts.model ?? config.ELEVENLABS_MODEL,
      voice_settings: {
        stability: opts.stability ?? 0.65,
        similarity_boost: opts.similarityBoost ?? 0.75,
        style: opts.style ?? 0.5,
        use_speaker_boost: opts.speakerBoost ?? true,
      },
    }

    logger.debug({
      voiceId: opts.voiceId,
      textLength: opts.text.length,
      model: body.model_id,
    }, 'ElevenLabs TTS request')

    const response = await fetch(url, {
      method: 'POST',
      headers: { ...this.authHeaders, Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({
        status: response.status,
        error: errorText,
        voiceId: opts.voiceId,
      }, 'ElevenLabs TTS failed')
      throw new Error(`ElevenLabs API error [${response.status}]: ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    logger.info({
      voiceId: opts.voiceId,
      sizeBytes: buffer.length,
      textLength: opts.text.length,
    }, 'TTS audio generated successfully')

    return buffer
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: this.authHeaders,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ElevenLabs voices: ${response.status}`)
    }

    const data = await response.json() as { voices: ElevenLabsVoice[] }
    return data.voices
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      headers: this.authHeaders,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription info: ${response.status}`)
    }

    return response.json() as Promise<SubscriptionInfo>
  }
}
