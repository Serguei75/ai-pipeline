import type { ThumbnailRequest, ThumbnailResult, ThumbnailVariant } from '../types.js';
import { config, PROVIDER_CONFIG, selectProvider } from '../config.js';
import { buildThumbnailPrompts } from './prompt-builder.service.js';
import { Imagen4Provider } from '../providers/imagen4.provider.js';
import { GptImageProvider } from '../providers/gpt-image.provider.js';
import { StorageService } from './storage.service.js';
import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Core Thumbnail Service
 *
 * Flow:
 * 1. LLM (Gemini 2.5 Flash-Lite) → generate N optimised image prompts
 * 2. Imagen 4 Fast/Standard → generate N variants
 * 3. GPT Image 1.5 → generate 1 high-quality A/B variant (if OPENAI_API_KEY set)
 * 4. Store all variants to object storage
 * 5. Return result with A/B grouping for testing
 *
 * Default cost per video:
 *   3 Imagen 4 Fast + 1 GPT Image = 3x$0.02 + 1x$0.04 = $0.10 total
 *   Batch mode: 3x$0.01 + 1x$0.04 = $0.07 total
 */
export class ThumbnailService {
  private readonly imagen4Fast: Imagen4Provider;
  private readonly imagen4Std: Imagen4Provider;
  private readonly gptImage: GptImageProvider | null;
  private readonly storage: StorageService;

  constructor() {
    const geminiKey = config.GEMINI_API_KEY;
    const openaiKey = config.OPENAI_API_KEY ?? '';

    this.imagen4Fast = new Imagen4Provider(geminiKey, 'imagen4-fast');
    this.imagen4Std  = new Imagen4Provider(geminiKey, 'imagen4-standard');
    this.gptImage    = openaiKey ? new GptImageProvider(openaiKey) : null;
    this.storage     = new StorageService();
  }

  async generate(request: ThumbnailRequest): Promise<ThumbnailResult> {
    const variantCount = request.variants ?? 3;
    const aspectRatios = request.aspectRatios ?? ['16:9'];

    logger.info({ videoTitle: request.videoTitle, variantCount }, 'Generating thumbnails');

    // Step 1: LLM generates prompts (fast + cheap via Flash-Lite)
    const prompts = await buildThumbnailPrompts(request, variantCount);
    logger.info({ promptCount: prompts.length }, 'Prompts generated');

    const allVariants: ThumbnailVariant[] = [];

    // Step 2: Imagen 4 Fast — bulk variants (primary, cheapest)
    for (const [i, p] of prompts.entries()) {
      const provider = request.draft
        ? this.imagen4Fast
        : this.imagen4Std;

      try {
        const variants = await provider.generate(
          p.prompt, p.negativePrompt, aspectRatios[0], 1,
        );
        const variant = variants[0];
        if (variant) {
          allVariants.push({ ...variant, style: p.style, prompt: p.prompt });
        }
      } catch (err) {
        logger.error({ err, index: i }, 'Imagen 4 generation failed for variant');
      }
    }

    // Step 3: GPT Image 1.5 A/B variant (highest Elo, best quality)
    if (this.gptImage && !request.draft) {
      try {
        const abPrompt = prompts[0]; // use best prompt for A/B
        const abVariants = await this.gptImage.generate(
          abPrompt.prompt, aspectRatios[0],
        );
        if (abVariants[0]) {
          allVariants.push({ ...abVariants[0], style: abPrompt.style });
        }
        logger.info('GPT Image 1.5 A/B variant generated');
      } catch (err) {
        logger.warn({ err }, 'GPT Image 1.5 failed — continuing with Imagen only');
      }
    }

    // Step 4: Upload to storage
    const stored: ThumbnailVariant[] = [];
    for (const v of allVariants) {
      try {
        const path = await this.storage.uploadBase64(
          v.imageBase64!,
          `thumbnails/${randomUUID()}-${v.provider}.jpg`,
        );
        stored.push({ ...v, storagePath: path, imageBase64: undefined });
      } catch (err) {
        logger.warn({ err, variantId: v.id }, 'Storage upload failed — keeping base64');
        stored.push(v);
      }
    }

    // Step 5: A/B grouping
    const imagenVariants = stored.filter((v) => v.provider.startsWith('imagen'));
    const gptVariants    = stored.filter((v) => v.provider === 'gpt-image-1.5');

    const groupA = imagenVariants[0]?.id ?? stored[0]?.id ?? '';
    const groupB = (gptVariants[0] ?? imagenVariants[1])?.id ?? groupA;
    const recommended = gptVariants[0]?.id ?? imagenVariants[0]?.id ?? '';

    const totalCost = stored.reduce((sum, v) => sum + v.costUsd, 0);

    logger.info({ variantsCount: stored.length, totalCost }, 'Thumbnail generation complete');

    return {
      videoTitle: request.videoTitle,
      variants: stored,
      totalCostUsd: totalCost,
      recommendedVariantId: recommended,
      abTestingGroups: { a: groupA, b: groupB },
    };
  }

  /** Regenerate a single variant using ultra-quality tier (for final approved video). */
  async upgradeToUltra(
    variantId: string,
    prompt: string,
    aspectRatio: '16:9' | '1:1' | '9:16' = '16:9',
  ): Promise<ThumbnailVariant> {
    const ultraProvider = new Imagen4Provider(
      config.GEMINI_API_KEY, 'imagen4-ultra',
    );
    const variants = await ultraProvider.generate(prompt, '', aspectRatio, 1);
    const v = variants[0]!;
    const path = await this.storage.uploadBase64(
      v.imageBase64!,
      `thumbnails/ultra-${randomUUID()}.jpg`,
    );
    return { ...v, storagePath: path, imageBase64: undefined };
  }
}
