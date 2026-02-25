import type { TTSProvider, TTSOptions, VoiceInfo } from './provider.interface.js';

/**
 * Kokoro TTS via Hugging Face Inference API
 * Cost: $0 — open-weight model (hexgrad/Kokoro-82M)
 * Perfect for: dev / CI / testing / hooks preview
 * Quality: surprisingly good for a free model
 */
export class KokoroProvider implements TTSProvider {
  name = 'kokoro-hf';
  private readonly modelUrl =
    'https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M';

  constructor(private readonly hfToken: string) {}

  async synthesize(text: string, voiceId = 'af_sky', _options?: TTSOptions): Promise<Buffer> {
    const response = await fetch(this.modelUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, parameters: { voice: voiceId } }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Kokoro HF error ${response.status}: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return [
      { id: 'af_sky', name: 'Sky (Female EN)', language: 'en', gender: 'female', provider: this.name },
      { id: 'af_bella', name: 'Bella (Female EN)', language: 'en', gender: 'female', provider: this.name },
      { id: 'am_adam', name: 'Adam (Male EN)', language: 'en', gender: 'male', provider: this.name },
      { id: 'am_michael', name: 'Michael (Male EN)', language: 'en', gender: 'male', provider: this.name },
      { id: 'bf_emma', name: 'Emma (Female EN-GB)', language: 'en-GB', gender: 'female', provider: this.name },
      { id: 'bm_george', name: 'George (Male EN-GB)', language: 'en-GB', gender: 'male', provider: this.name },
    ];
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.modelUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.hfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'ping' }),
      });
      return response.status !== 503;
    } catch {
      return false;
    }
  }
}
