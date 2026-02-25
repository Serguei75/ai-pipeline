/**
 * TtsRouter — Smart Provider Selector (v2 — no subscription providers)
 *
 * Provider stack (all pay-per-use or free):
 *
 *   KokoroProvider          — HF Kokoro-82M, $0, dev/CI
 *   GoogleCloudTtsProvider  — 1M chars/mo FREE forever, then $16/1M (prod)
 *   FishAudioProvider       — $15/1M bytes, pay-per-use, cloning included
 *   PollyProvider           — $4-16/1M, kept as fallback / high-volume alt
 *
 * Routing rules (priority order):
 *   1. clone=true            → FishAudio  ($0 minimum, pay-per-use cloning)
 *   2. mode='dev'|free       → Kokoro     ($0)
 *   3. mode='prod'|standard  → Google TTS ($0 up to 1M chars/mo!)
 *   4. quality='economy'     → Polly std  ($4/1M, cheaper above 1M)
 *   5. default               → Google TTS
 *
 * Monthly cost example (320k chars):
 *   Dev:   Kokoro  → $0.00
 *   Prod:  Google  → $0.00  (under 1M free tier)
 *   Clone: Fish    → ~$4.80 only when cloning is used
 *   TOTAL: $0.00 – $4.80/mo
 */

import { KokoroProvider }          from './kokoro.provider.js'
import { GoogleCloudTtsProvider }  from './google-cloud-tts.provider.js'
import { FishAudioProvider }       from './fish-audio.provider.js'
import { PollyProvider }           from './polly.provider.js'
import type { TtsProvider, RoutingOpts } from './tts-provider.interface.js'

export class TtsRouter {
  readonly kokoro:  KokoroProvider
  readonly google:  GoogleCloudTtsProvider
  readonly fish:    FishAudioProvider
  readonly polly:   PollyProvider           // fallback / high-volume

  constructor() {
    this.kokoro = new KokoroProvider()
    this.google = new GoogleCloudTtsProvider()
    this.fish   = new FishAudioProvider()
    this.polly  = new PollyProvider()
  }

  /**
   * Select the optimal provider.
   * Priority: free > pay-per-use > fallback
   */
  select(opts: RoutingOpts = {}): TtsProvider {
    // 1. Voice cloning → Fish Audio (only pay-per-use provider with cloning)
    if (opts.clone || opts.mode === 'clone') return this.fish

    // 2. Dev / free tier → Kokoro (HuggingFace, no cost)
    if (opts.mode === 'dev' || opts.quality === 'free') return this.kokoro

    // 3. Economy override → Polly standard (cheapest above 1M chars)
    if (opts.quality === 'economy') return this.polly

    // 4. Default prod → Google TTS (1M chars/mo free, then pay-per-use)
    return this.google
  }

  all(): TtsProvider[] {
    return [this.kokoro, this.google, this.fish, this.polly]
  }

  /**
   * Estimate monthly cost across all scenarios.
   * Returns a breakdown table for NanoBot Heartbeat monitoring.
   */
  estimateMonthlyCost(
    charsPerMonth: number,
    opts: RoutingOpts = {}
  ): { provider: string; costUsd: number; breakdown: string } {
    const provider = this.select(opts)
    const costUsd  = provider.estimateCost(charsPerMonth)
    const breakdown = [
      `provider=${provider.name}`,
      `chars=${charsPerMonth.toLocaleString()}/mo`,
      `rate=$${provider.costPer1kChars.toFixed(4)}/1k`,
      `total=$${costUsd.toFixed(2)}/mo`,
    ].join(' | ')
    return { provider: provider.name, costUsd, breakdown }
  }

  /** Google free tier remaining chars this month */
  googleFreeRemaining(): number {
    return this.google.getUsage().remaining
  }
}
