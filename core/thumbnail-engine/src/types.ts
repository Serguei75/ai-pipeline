export type Provider = 'HUGGINGFACE' | 'FAL' | 'CLOUDFLARE' | 'MOCK';
export type AspectRatio = 'LANDSCAPE_16_9' | 'PORTRAIT_9_16' | 'SQUARE_1_1';

export interface GenerateRequest {
  prompt: string;
  negativePrompt?: string;
  videoId?: string;
  aspectRatio?: AspectRatio;
  providerOverride?: Provider;
  steps?: number;
}

export interface ProviderConfig {
  width: number;
  height: number;
}

export const ASPECT_CONFIGS: Record<AspectRatio, ProviderConfig> = {
  LANDSCAPE_16_9: { width: 1280, height: 720  },  // YouTube стандарт
  PORTRAIT_9_16:  { width: 720,  height: 1280 },  // Shorts
  SQUARE_1_1:     { width: 1024, height: 1024 },  // Универсальный
};

export interface IProvider {
  name: Provider;
  generate(
    prompt: string,
    config: ProviderConfig,
    negativePrompt?: string
  ): Promise<{
    imageBuffer: Buffer;
    model: string;
    costUsd: number;
  }>;
}
