import type { TTSProvider } from './provider.interface.js';
import { GoogleTTSProvider } from './google-tts.provider.js';
import { FishAudioProvider } from './fish-audio.provider.js';
import { ResembleProvider } from './resemble.provider.js';
import { KokoroProvider } from './kokoro.provider.js';
import pino from 'pino';

export type ProviderName = 'google-tts' | 'fish-audio' | 'resemble-ai' | 'kokoro-hf';
export type UseCase = 'dev' | 'standard' | 'brand-voice';

const logger = pino({ level: 'info' });

export interface ProviderConfig {
  NODE_ENV: string;
  HF_TOKEN: string;
  GOOGLE_TTS_API_KEY?: string;
  FISH_AUDIO_API_KEY?: string;
  RESEMBLE_API_KEY?: string;
}

/**
 * TTS Provider Factory — selects the optimal provider per use case:
 *
 * | Use case     | Primary         | Fallback        | Cost      |
 * |--------------|-----------------|-----------------|----------|
 * | dev          | kokoro-hf       | —               | $0        |
 * | standard     | google-tts      | kokoro-hf       | $0–$16/1M |
 * | brand-voice  | fish-audio      | resemble-ai     | Free tier |
 */
export class TTSProviderFactory {
  private readonly providers = new Map<ProviderName, TTSProvider>();

  constructor(config: ProviderConfig) {
    // Kokoro is always registered — free fallback
    this.providers.set('kokoro-hf', new KokoroProvider(config.HF_TOKEN));

    if (config.GOOGLE_TTS_API_KEY) {
      this.providers.set('google-tts', new GoogleTTSProvider(config.GOOGLE_TTS_API_KEY));
    }
    if (config.FISH_AUDIO_API_KEY) {
      this.providers.set('fish-audio', new FishAudioProvider(config.FISH_AUDIO_API_KEY));
    }
    if (config.RESEMBLE_API_KEY) {
      this.providers.set('resemble-ai', new ResembleProvider(config.RESEMBLE_API_KEY));
    }
  }

  selectProvider(useCase: UseCase, env = 'production'): TTSProvider {
    if (env === 'development' || useCase === 'dev') {
      return this.getOrFallback('kokoro-hf');
    }
    if (useCase === 'standard') {
      return this.getOrFallback('google-tts', 'kokoro-hf');
    }
    if (useCase === 'brand-voice') {
      return this.getOrFallback('fish-audio', 'resemble-ai', 'kokoro-hf');
    }
    return this.getOrFallback('google-tts', 'kokoro-hf');
  }

  get(name: ProviderName): TTSProvider | undefined {
    return this.providers.get(name);
  }

  listAvailable(): ProviderName[] {
    return [...this.providers.keys()];
  }

  private getOrFallback(...names: ProviderName[]): TTSProvider {
    for (const name of names) {
      const p = this.providers.get(name);
      if (p) {
        logger.info({ provider: name }, 'TTS provider selected');
        return p;
      }
    }
    logger.warn('All preferred providers unavailable — falling back to kokoro-hf');
    return this.providers.get('kokoro-hf')!;
  }
}
