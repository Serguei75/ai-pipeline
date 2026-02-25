import axios from 'axios';
import { IProvider, ProviderConfig, Provider } from '../types';

const DEFAULT_MODEL = process.env.HUGGINGFACE_MODEL || 'black-forest-labs/FLUX.1-schnell';
const API_BASE = 'https://api-inference.huggingface.co/models';

export class HuggingFaceProvider implements IProvider {
  name: Provider = 'HUGGINGFACE';

  async generate(prompt: string, config: ProviderConfig, negativePrompt?: string) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not set');

    const model = DEFAULT_MODEL;
    console.log(`[HuggingFace] Model: ${model} | ${config.width}x${config.height}`);

    const response = await axios.post(
      `${API_BASE}/${model}`,
      {
        inputs: prompt,
        parameters: {
          width: config.width,
          height: config.height,
          num_inference_steps: 4, // FLUX.1-schnell: 4 шага — оптимально
          negative_prompt: negativePrompt || 'blurry, low quality, watermark, text artifacts, nsfw',
          guidance_scale: 0,       // Schnell не требует guidance
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true', // Ждём загрузки модели если cold start
        },
        responseType: 'arraybuffer',
        timeout: 120_000,
      }
    );

    return {
      imageBuffer: Buffer.from(response.data),
      model,
      costUsd: 0, // Free Inference API
    };
  }
}
