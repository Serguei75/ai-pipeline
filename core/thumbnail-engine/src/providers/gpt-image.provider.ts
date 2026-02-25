import type { AspectRatio, ThumbnailVariant } from '../types.js';
import { PROVIDER_CONFIG } from '../config.js';
import { randomUUID } from 'crypto';

const ASPECT_SIZE_MAP: Record<AspectRatio, string> = {
  '16:9': '1792x1024',
  '1:1':  '1024x1024',
  '9:16': '1024x1792',
};

interface OpenAIImageResponse {
  data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
}

/**
 * GPT Image 1.5 provider (OpenAI).
 *
 * Replaces DALL-E 3 completely as of 2026.
 * GPT Image 1.5 has the highest Arena Elo (1264) among all providers.
 * Best for: A/B test "winner" variant, highest-quality single thumbnail.
 *
 * Pricing: $0.04/image (standard quality, 1024x1024).
 */
export class GptImageProvider {
  private readonly cfg = PROVIDER_CONFIG['gpt-image-1.5'];
  private readonly baseUrl = 'https://api.openai.com/v1/images/generations';

  constructor(private readonly apiKey: string) {}

  async generate(
    prompt: string,
    aspectRatio: AspectRatio = '16:9',
  ): Promise<ThumbnailVariant[]> {
    const size = ASPECT_SIZE_MAP[aspectRatio];

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        prompt,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GPT Image 1.5 error ${response.status}: ${err.substring(0, 300)}`);
    }

    const data = (await response.json()) as OpenAIImageResponse;

    return data.data.map((item) => ({
      id: randomUUID(),
      provider: 'gpt-image-1.5' as const,
      aspectRatio,
      style: 'dramatic' as const,
      prompt: item.revised_prompt ?? prompt,
      imageBase64: item.b64_json,
      ctvOptimised: true,
      costUsd: this.cfg.pricePerImage,
      generatedAt: new Date().toISOString(),
    }));
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }
}
