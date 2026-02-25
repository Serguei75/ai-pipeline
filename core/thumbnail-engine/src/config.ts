import { z } from 'zod';
import type { ImageProvider, ProviderConfig } from './types.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3009'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for Imagen 4'),
  OPENAI_API_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default('ai-pipeline-thumbnails'),
  STORAGE_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ai_pipeline'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('\u274c Thumbnail Engine config error:', JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const config = result.data;

/**
 * Provider registry — Feb 2026 pricing.
 *
 * Imagen 4 Fast is the default:
 *  - $0.02/image (Batch API: $0.01/image)
 *  - Arena Elo ~1,225 — excellent quality for thumbnails
 *  - Same API key as Gemini (GEMINI_API_KEY) — zero extra integration
 *
 * DALL-E 3 removed: legacy model, replaced by GPT Image 1.5.
 * Stability AI removed: superseded by Imagen 4 on quality & price.
 */
export const PROVIDER_CONFIG: Record<ImageProvider, ProviderConfig> = {
  'imagen4-fast': {
    pricePerImage: 0.02,
    model: 'imagen-4.0-fast-generate-preview-05-20',
    maxVariantsPerCall: 4,
    supportsBatch: true,
    avgEloScore: 1225,
  },
  'imagen4-standard': {
    pricePerImage: 0.04,
    model: 'imagen-4.0-generate-preview-05-20',
    maxVariantsPerCall: 4,
    supportsBatch: true,
    avgEloScore: 1230,
  },
  'imagen4-ultra': {
    pricePerImage: 0.06,
    model: 'imagen-4.0-ultra-generate-preview-05-20',
    maxVariantsPerCall: 1,
    supportsBatch: false,
    avgEloScore: 1240,
  },
  'gpt-image-1.5': {
    pricePerImage: 0.04,
    model: 'gpt-image-1.5',
    maxVariantsPerCall: 1,
    supportsBatch: false,
    avgEloScore: 1264, // highest Elo among all providers
  },
};

/** Select provider based on use case */
export function selectProvider(draft: boolean, useAbTest: boolean): ImageProvider {
  if (draft) return 'imagen4-fast';       // cheapest for drafts
  if (useAbTest) return 'gpt-image-1.5'; // highest Elo for A/B winner
  return 'imagen4-standard';              // default prod quality
}
