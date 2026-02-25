import { IProvider, ProviderConfig, Provider } from '../types';

export class MockProvider implements IProvider {
  name: Provider = 'MOCK';

  async generate(prompt: string, config: ProviderConfig) {
    console.log(`[MOCK] Generating ${config.width}x${config.height} | "${prompt.slice(0, 60)}..."`);

    // Minimal 1x1 transparent PNG
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4' +
      '890000000a4944415478016360f8cf00000002000153d5e6420000000049454e44ae426082',
      'hex'
    );

    await new Promise(r => setTimeout(r, 300)); // Симуляция задержки API
    return { imageBuffer: pngBuffer, model: 'mock/placeholder-v1', costUsd: 0 };
  }
}
