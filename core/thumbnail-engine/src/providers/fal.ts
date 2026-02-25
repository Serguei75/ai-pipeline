import axios from 'axios';
import { IProvider, ProviderConfig, Provider } from '../types';

const DEFAULT_MODEL = process.env.FAL_MODEL || 'fal-ai/flux/schnell';

// Приблизительная стоимость за изображение (USD)
const COST_MAP: Record<string, number> = {
  'fal-ai/flux/schnell': 0.003,
  'fal-ai/flux/dev': 0.025,
  'fal-ai/flux-pro': 0.05,
  'fal-ai/flux-pro/v1.1': 0.04,
  'fal-ai/stable-diffusion-v3-medium': 0.010,
  'fal-ai/stable-diffusion-xl': 0.008,
};

export class FalProvider implements IProvider {
  name: Provider = 'FAL';

  async generate(prompt: string, config: ProviderConfig, negativePrompt?: string) {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY is not set');

    const model = DEFAULT_MODEL;
    console.log(`[FAL] Model: ${model} | ${config.width}x${config.height}`);

    const response = await axios.post(
      `https://fal.run/${model}`,
      {
        prompt,
        image_size: { width: config.width, height: config.height },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
      {
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120_000,
      }
    );

    const imageUrl: string = response.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error('[FAL] No image URL in response');

    // Скачиваем изображение
    const imgResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30_000,
    });

    return {
      imageBuffer: Buffer.from(imgResponse.data),
      model,
      costUsd: COST_MAP[model] ?? 0.003,
    };
  }
}
