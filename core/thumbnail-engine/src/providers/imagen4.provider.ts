import type { AspectRatio, ImageProvider, ThumbnailVariant } from '../types.js';
import { PROVIDER_CONFIG } from '../config.js';
import { randomUUID } from 'crypto';

interface Imagen4Response {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

/**
 * Imagen 4 provider (Fast / Standard / Ultra) via Vertex AI REST API.
 *
 * Pricing (Feb 2026):
 *   Fast:     $0.02/image  ← default, Batch API = $0.01
 *   Standard: $0.04/image
 *   Ultra:    $0.06/image
 *
 * DALL-E 3 and Stability AI are NOT used — legacy as of 2026.
 */
export class Imagen4Provider {
  private readonly endpoint: string;
  private readonly cfg;

  constructor(
    private readonly apiKey: string,
    private readonly variant: 'imagen4-fast' | 'imagen4-standard' | 'imagen4-ultra',
    private readonly projectId: string = 'ai-pipeline',
    private readonly region: string = 'us-central1',
  ) {
    this.cfg = PROVIDER_CONFIG[variant];
    this.endpoint =
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}` +
      `/locations/${region}/publishers/google/models/${this.cfg.model}:predict`;
  }

  async generate(
    prompt: string,
    negativePrompt: string,
    aspectRatio: AspectRatio = '16:9',
    count = 1,
  ): Promise<ThumbnailVariant[]> {
    const body = {
      instances: [{ prompt, negativePrompt }],
      parameters: {
        sampleCount: Math.min(count, this.cfg.maxVariantsPerCall),
        aspectRatio,
        safetyFilterLevel: 'BLOCK_SOME',
        personGeneration: 'ALLOW_ADULT',
        enhancePrompt: true,
      },
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Imagen4 ${this.variant} error ${response.status}: ${err.substring(0, 300)}`);
    }

    const data = (await response.json()) as Imagen4Response;

    return data.predictions.map((pred) => ({
      id: randomUUID(),
      provider: this.variant as ImageProvider,
      aspectRatio,
      style: 'dramatic' as const,
      prompt,
      imageBase64: pred.bytesBase64Encoded,
      ctvOptimised: true,
      costUsd: this.cfg.pricePerImage,
      generatedAt: new Date().toISOString(),
    }));
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }
}
