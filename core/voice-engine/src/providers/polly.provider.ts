/**
 * PollyProvider — Amazon Polly Neural TTS
 *
 * Pricing: $16/1M chars (Neural) | $4/1M chars (Standard)
 * Free Tier: 5M standard chars/month for first 12 months
 * Use: Production standard voice, best value for cost/quality
 *
 * Required env:
 *   AWS_REGION               (default: us-east-1)
 *   AWS_ACCESS_KEY_ID        (or IAM role / profile)
 *   AWS_SECRET_ACCESS_KEY
 *   POLLY_ENGINE             'neural' | 'standard' (default: 'neural')
 *   POLLY_DEFAULT_VOICE_ID   (default: 'Joanna')
 */

import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } from '@aws-sdk/client-polly'
import type { TtsProvider, TtsGenerateOpts, TtsGenerateResult, Voice } from './tts-provider.interface.js'

type PollyEngine = 'neural' | 'standard' | 'long-form' | 'generative'

const NEURAL_COST_PER_1K  = 0.016   // $16 / 1M
const STANDARD_COST_PER_1K = 0.004  // $4  / 1M

export class PollyProvider implements TtsProvider {
  readonly name            = 'amazon-polly'
  readonly supportsCloning = false

  private client: PollyClient
  private engine: PollyEngine
  private defaultVoiceId: string

  get costPer1kChars(): number {
    return this.engine === 'neural' ? NEURAL_COST_PER_1K : STANDARD_COST_PER_1K
  }

  constructor(
    engine        = (process.env.POLLY_ENGINE         ?? 'neural') as PollyEngine,
    defaultVoice  =  process.env.POLLY_DEFAULT_VOICE_ID ?? 'Joanna',
  ) {
    this.engine         = engine
    this.defaultVoiceId = defaultVoice
    this.client = new PollyClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      // Credentials: auto-resolved from env vars, ~/.aws/credentials, or IAM role
      ...(process.env.AWS_ACCESS_KEY_ID ? {
        credentials: {
          accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        },
      } : {}),
    })
  }

  async generate(text: string, opts?: TtsGenerateOpts): Promise<TtsGenerateResult> {
    const voiceId = (opts?.voiceId ?? this.defaultVoiceId) as string

    const cmd = new SynthesizeSpeechCommand({
      Text:         text,
      OutputFormat: 'mp3',
      VoiceId:      voiceId as any,
      Engine:       this.engine,
      SampleRate:   '24000',
    })

    const res = await this.client.send(cmd)

    if (!res.AudioStream) {
      throw new Error('Polly returned no AudioStream')
    }

    // Collect stream chunks — works for both Node.js stream and web ReadableStream
    const chunks: Uint8Array[] = []
    for await (const chunk of res.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    return {
      audioBuffer,
      contentType:       'audio/mpeg',
      characterCount:    text.length,
      estimatedCostUsd:  this.estimateCost(text.length),
      providerName:      this.name,
    }
  }

  async listVoices(): Promise<Voice[]> {
    const cmd = new DescribeVoicesCommand({ Engine: this.engine })
    const res = await this.client.send(cmd)

    return (res.Voices ?? []).map((v) => ({
      id:       v.Id ?? '',
      name:     v.Name ?? '',
      provider: this.name,
      language: v.LanguageCode ?? 'en-US',
      gender:   (v.Gender?.toLowerCase() as Voice['gender']) ?? 'neutral',
      category: this.engine === 'neural' ? 'neural' : 'standard',
      tags:     v.SupportedEngines ?? [],
    }))
  }

  estimateCost(chars: number): number {
    return (chars / 1_000) * this.costPer1kChars
  }
}
