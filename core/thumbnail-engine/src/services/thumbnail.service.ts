import type { ThumbnailRequest, ThumbnailResult, ThumbnailVariant } from '../types.js';
import { config, PROVIDER_CONFIG } from '../config.js';
import { buildThumbnailPrompts } from './prompt-builder.service.js';
import { Imagen4Provider } from '../providers/imagen4.provider.js';
import { GptImageProvider } from '../providers/gpt-image.provider.js';
import { HuggingFaceProvider } from '../providers/huggingface.js';
import { CloudflareProvider } from '../providers/cloudflare.js';
import { MockProvider } from '../providers/mock.js';
import { KieAIProvider } from '../providers/kieai-provider.js';
import { StorageService } from './storage.service.js';
import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Core Thumbnail Service with FALLBACK providers
 * 
 * Provider priority:
 * 1. Imagen4 (if GEMINI_API_KEY valid with OAuth)
 * 2. GPT Image (if OPENAI_API_KEY valid)
 * 3. HuggingFace (FREE - fallback)
 * 4. Cloudflare (FREE - fallback)
 * 5. Mock (always works - testing)
 */
export class ThumbnailService {
  private readonly providers: any[] = [];
  private readonly storage: StorageService;

  constructor() {
    const geminiKey = config.GEMINI_API_KEY;
    const openaiKey = config.OPENAI_API_KEY ?? '';

    // Register providers in priority order
    // Imagen4 commented out - requires OAuth setup
    // if (geminiKey) {
    //   this.providers.push(new Imagen4Provider(geminiKey, 'imagen4-fast'));
    // }
    
    // GPT Image requires valid key
    // if (openaiKey && openaiKey !== 'sk-placeholder-replace-me') {
    //   this.providers.push(new GptImageProvider(openaiKey));
    // }

    // FREE providers - always available
    this.providers.push(new HuggingFaceProvider());
    this.providers.push(new CloudflareProvider());

    // Kie.ai provider (if API key configured) - before Mock
    const kieaiKey = config.KIEAI_API_KEY;
    if (kieaiKey) {
      this.providers.push(new KieAIProvider({ apiKey: kieaiKey }));
    }

    this.providers.push(new MockProvider());

    this.storage = new StorageService();

    logger.info({ 
      providerCount: this.providers.length,
      providers: this.providers.map(p => p.constructor.name)
    }, 'Thumbnail service initialized with providers');
  }

  async generate(request: ThumbnailRequest): Promise<ThumbnailResult> {
    const variantCount = request.variants ?? 3;
    const aspectRatios = request.aspectRatios ?? ['16:9'];

    logger.info({ videoTitle: request.videoTitle, variantCount }, 'Generating thumbnails');

    // Step 1: Generate prompts
    const prompts = await buildThumbnailPrompts(request, variantCount);
    logger.info({ promptCount: prompts.length }, 'Prompts generated');

    const allVariants: ThumbnailVariant[] = [];

    // Step 2: Try each provider until one succeeds
    for (const [i, p] of prompts.entries()) {
      let success = false;

      for (const provider of this.providers) {
        try {
          logger.info({ 
            provider: provider.constructor.name, 
            promptIndex: i 
          }, 'Attempting generation');

          const result = await provider.generate(
            p.prompt,
            p.negativePrompt || '',
            aspectRatios[0],
            1
          );

          if (result && result.imageBuffer) {
            allVariants.push({
              id: randomUUID(),
              provider: provider.name,
              aspectRatio: aspectRatios[0] as any,
              style: p.style,
              prompt: p.prompt,
              imageBase64: result.imageBuffer.toString('base64'),
              ctvOptimised: false,
              costUsd: result.costUsd || 0,
              generatedAt: new Date().toISOString()
            });
            success = true;
            logger.info({
              provider: provider.constructor.name,
              promptIndex: i
            }, 'Generation successful');
            break; // Success - skip remaining providers
          }
        } catch (err: any) {
          logger.warn({ 
            err: err.message, 
            provider: provider.constructor.name,
            promptIndex: i
          }, 'Provider failed, trying next');
        }
      }

      if (!success) {
        logger.error({ promptIndex: i }, 'All providers failed for variant');
      }
    }

    // Step 3: Upload to storage
    const stored: ThumbnailVariant[] = [];
    for (const v of allVariants) {
      try {
        if (v.imageBase64) {
          const path = await this.storage.uploadBase64(
            v.imageBase64,
            `thumbnails/${randomUUID()}-${v.provider}.jpg`
          );
          stored.push({ ...v, storagePath: path, imageBase64: undefined });
        } else {
          stored.push(v);
        }
      } catch (err) {
        logger.warn({ err, variantId: v.id }, 'Storage upload failed');
        stored.push(v);
      }
    }

    const totalCost = stored.reduce((sum, v) => sum + (v.costUsd ?? 0), 0);

    return {
      videoTitle: request.videoTitle,
      variants: stored,
      totalCostUsd: totalCost,
      recommendedVariantId: stored[0]?.id ?? '',
      abTestingGroups: {
        a: stored[0]?.id ?? '',
        b: stored[1]?.id ?? '',
      },
    };
  }

  async upgradeToUltra(
    variantId: string,
    prompt: string,
    aspectRatio: '16:9' | '1:1' | '9:16' = '16:9'
  ): Promise<ThumbnailVariant> {
    // Try Imagen4 Ultra if available
    const geminiKey = config.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ultraProvider = new Imagen4Provider(geminiKey, 'imagen4-ultra');
        const result = await ultraProvider.generate(prompt, '', aspectRatio, 1);
        if (result && result.imageBuffer) {
          const path = await this.storage.uploadBase64(
            result.imageBuffer.toString('base64'),
            `thumbnails/ultra-${randomUUID()}.jpg`
          );
          return {
            id: randomUUID(),
            provider: 'imagen4-ultra',
            aspectRatio,
            style: 'dramatic',
            prompt,
            storagePath: path,
            ctvOptimised: false,
            costUsd: result.costUsd || 0,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        logger.error({ err }, 'Ultra upgrade failed');
      }
    }

    // Fallback - use best available provider
    for (const provider of this.providers) {
      try {
        const result = await provider.generate(prompt, '', aspectRatio, 1);
        if (result && result.imageBuffer) {
          const path = await this.storage.uploadBase64(
            result.imageBuffer.toString('base64'),
            `thumbnails/upgraded-${randomUUID()}.jpg`
          );
          return {
            id: randomUUID(),
            provider: provider.name as any,
            aspectRatio,
            style: 'dramatic',
            prompt,
            storagePath: path,
            ctvOptimised: false,
            costUsd: result.costUsd || 0,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        continue;
      }
    }

    throw new Error('All providers failed for ultra upgrade');
  }
}

export const thumbnailService = new ThumbnailService();
