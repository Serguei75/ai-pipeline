/**
 * TtsRouter — Smart Provider Selector
 *
 * Routing rules (priority order):
 *   1. clone=true           → ResembleProvider  (only supports cloning)
 *   2. mode='dev' | free    → KokoroProvider    ($0, ideal for dev/CI)
 *   3. mode='prod' | economy→ PollyProvider     (cheapest real quality)
 *   4. standard / default   → PollyProvider
 *
 * Cost estimate example (320k chars/month):
 *   Dev route  (Kokoro): $0.00
 *   Prod route (Polly):  $5.12  (neural) / $1.28 (standard)
 *   Clone route (Resemble): $5-19/mo flat
 */

import { KokoroProvider }   from './kokoro.provider.js'
import { PollyProvider }    from './polly.provider.js'
import { ResembleProvider } from './resemble.provider.js'
import type { TtsProvider, RoutingOpts } from './tts-provider.interface.js'

export class TtsRouter {
  readonly kokoro:   KokoroProvider
  readonly polly:    PollyProvider
  readonly resemble: ResembleProvider

  constructor() {
    this.kokoro   = new KokoroProvider()
    this.polly    = new PollyProvider()
    this.resemble = new ResembleProvider()
  }

  /**
   * Select the optimal provider based on routing opts.
   * Never throws — always returns a valid provider.
   */
  select(opts: RoutingOpts = {}): TtsProvider {
    // 1. Voice cloning → always Resemble
    if (opts.clone) return this.resemble

    // 2. Dev / free → Kokoro (HuggingFace, no cost)
    if (opts.mode === 'dev' || opts.quality === 'free') return this.kokoro

    // 3. Production / economy / standard → Amazon Polly
    if (
      opts.mode    === 'prod'     ||
      opts.quality === 'economy'  ||
      opts.quality === 'standard'
    ) return this.polly

    // 4. Default fallback → Polly (cost-effective)
    return this.polly
  }

  /** All providers (for listVoices aggregation or health checks) */
  all(): TtsProvider[] {
    return [this.kokoro, this.polly, this.resemble]
  }

  /**
   * Estimate monthly cost for a given volume.
   * Useful for NanoBot's Heartbeat monitor / cost-tracker integration.
   */
  estimateMonthlyCost(
    charsPerMonth: number,
    opts: RoutingOpts = {}
  ): { provider: string; costUsd: number; breakdown: string } {
    const provider = this.select(opts)
    const costUsd  = provider.estimateCost(charsPerMonth)

    const breakdown = [
      `Provider: ${provider.name}`,
      `Chars: ${charsPerMonth.toLocaleString()}/month`,
      `Rate: $${provider.costPer1kChars.toFixed(4)}/1k chars`,
      `Total: $${costUsd.toFixed(2)}/month`,
    ].join(' | ')

    return { provider: provider.name, costUsd, breakdown }
  }
}
