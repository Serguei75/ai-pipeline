import axios from 'axios';
import type { IProvider, ProviderConfig, Provider } from '../types.js';

const DEFAULT_MODEL = process.env.KIEAI_MODEL || 'gpt-image-1';
const API_BASE = process.env.KIEAI_BASE_URL || 'https://api.kie.ai';

export class KieAIProvider implements IProvider {
  name: Provider = 'KIEAI';

  async generate(prompt: string, config: ProviderConfig, negativePrompt?: string) {
    const apiKey = process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error('KIEAI_API_KEY is not set');

    const model = DEFAULT_MODEL;
    const width = config.width || 1792;
    const height = config.height || 1024;
    
    console.log(`[KieAI] Model: ${model} | ${width}x${height}`);

    // OpenAI-compatible images/generations endpoint
    const response = await axios.post(
      `${API_BASE}/v1/images/generations`,
      {
        model: model,
        prompt: prompt,
        n: 1,
        size: `${width}x${height}`,
        quality: 'hd',
        response_format: 'url'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'json',
        timeout: 60000
      }
    );

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('KieAI: No image URL in response');
    }

    // Download image as buffer
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    return {
      imageBuffer: Buffer.from(imageResponse.data),
      model,
      costUsd: 0,
    };
  }
}
