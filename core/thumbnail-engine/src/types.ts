/**
 * Thumbnail Engine types
 * Feb 2026 stack:
 *   Imagen 4 Fast    — $0.02/img  (default, Batch = $0.01/img)
 *   Imagen 4 Standard — $0.04/img  (quality tier)
 *   Imagen 4 Ultra   — $0.06/img  (max quality, slow)
 *   GPT Image 1.5    — $0.04/img  (A/B alternative, highest Elo 1264)
 *
 * DALL-E 3 and Stability AI are legacy as of 2026 — not used.
 */

export type ImageProvider = 'imagen4-fast' | 'imagen4-standard' | 'imagen4-ultra' | 'gpt-image-1.5';
export type AspectRatio = '16:9' | '1:1' | '9:16';
export type ThumbnailStyle = 'dramatic' | 'clean' | 'curiosity' | 'fear' | 'surprise' | 'desire';
export type ChannelType = 'FUEL' | 'INTELLECTUAL';

export interface ThumbnailRequest {
  videoTitle: string;
  hookText: string;
  hookEmotion: string;
  niche: string;
  targetMarket: string;
  channelType: ChannelType;
  /** Number of variants to generate (default: 3) */
  variants?: number;
  /** Aspect ratios to generate (default: ['16:9']) */
  aspectRatios?: AspectRatio[];
  /** Override auto-selected provider */
  provider?: ImageProvider;
  /** Use fast/cheap tier for drafts */
  draft?: boolean;
}

export interface ThumbnailVariant {
  id: string;
  provider: ImageProvider;
  aspectRatio: AspectRatio;
  style: ThumbnailStyle;
  prompt: string;
  imageBase64?: string;
  imageUrl?: string;
  storagePath?: string;
  ctvOptimised: boolean;
  costUsd: number;
  generatedAt: string;
}

export interface ThumbnailResult {
  videoTitle: string;
  variants: ThumbnailVariant[];
  totalCostUsd: number;
  recommendedVariantId: string;
  abTestingGroups: { a: string; b: string };
}

export interface ProviderConfig {
  pricePerImage: number;
  model: string;
  maxVariantsPerCall: number;
  supportsBatch: boolean;
  avgEloScore: number;
  width?: number;
  height?: number;
}

export type Provider = 'HUGGINGFACE' | 'CLOUDFLARE' | 'MOCK' | 'FAL' | 'KIEAI';

export interface IProvider {
  name: Provider;
  generate(prompt: string, config: ProviderConfig, negativePrompt?: string): Promise<{
    imageBuffer: Buffer;
    model: string;
    costUsd: number;
  }>;
}
