import type { TTSProvider, TTSOptions, VoiceInfo } from './provider.interface.js';

/**
 * Resemble AI
 * IMPORTANT: Changed pricing model in early 2026 — now PAY-PER-USE (credits, no expiry)
 * No subscription required. Good alternative to Fish Audio for voice agents.
 * API docs: https://docs.resemble.ai
 */
export class ResembleProvider implements TTSProvider {
  name = 'resemble-ai';
  private readonly baseUrl = 'https://app.resemble.ai/api/v2';

  constructor(private readonly apiKey: string) {}

  async synthesize(text: string, voiceId: string, _options?: TTSOptions): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/projects/clips/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_uuid: voiceId,
        body: `<speak>${text}</speak>`,
        is_public: false,
        is_archived: false,
        sample_rate: 44100,
        output_format: 'mp3',
        precision: 'PCM_32',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resemble AI error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { item?: { audio_src: string } };
    if (!data.item?.audio_src) throw new Error('Resemble AI: missing audio_src');

    const audioResponse = await fetch(data.item.audio_src);
    const buffer = await audioResponse.arrayBuffer();
    return Buffer.from(buffer);
  }

  async getVoices(): Promise<VoiceInfo[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { Authorization: `Token token=${this.apiKey}` },
    });

    if (!response.ok) throw new Error('Failed to fetch Resemble voices');

    const data = (await response.json()) as {
      items: Array<{ uuid: string; name: string; language: string; gender: string }>;
    };

    return data.items.map((v) => ({
      id: v.uuid,
      name: v.name,
      language: v.language ?? 'en',
      gender: v.gender,
      provider: this.name,
    }));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { Authorization: `Token token=${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
