import axios from 'axios';
import { IProvider, ProviderConfig, Provider } from '../types';

const DEFAULT_MODEL = process.env.CLOUDFLARE_MODEL || '@cf/black-forest-labs/flux-1-schnell';

export class CloudflareProvider implements IProvider {
  name: Provider = 'CLOUDFLARE';

  async generate(prompt: string, config: ProviderConfig) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required');
    }

    const model = DEFAULT_MODEL;
    console.log(`[Cloudflare] Model: ${model} | ${config.width}x${config.height}`);

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      { prompt, width: config.width, height: config.height },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60_000,
      }
    );

    return {
      imageBuffer: Buffer.from(response.data),
      model,
      costUsd: 0, // Cloudflare Workers AI free tier
    };
  }
}
