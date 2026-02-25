import type { TTSProvider, TTSOptions, VoiceInfo } from './provider.interface.js';

/**
 * Fish Audio TTS
 * Free tier: voice creation + generation included (free plan)
 * Paid: from $4.49/mo for higher volumes
 * 200k+ community voices, voice cloning built-in
 * Best for: brand voice / clone scenarios
 * API: https://docs.fish.audio
 */
export class FishAudioProvider implements TTSProvider {
  name = 'fish-audio';
  private readonly baseUrl = 'https://api.fish.audio';

  constructor(private readonly apiKey: string) {}

  async synthesize(text: string, voiceId: string, _options?: TTSOptions): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/v1/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reference_id: voiceId,
        format: 'mp3',
        mp3_bitrate: 192,
        normalize: true,
        latency: 'normal',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Fish Audio error ${response.status}: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  async getVoices(): Promise<VoiceInfo[]> {
    const response = await fetch(`${this.baseUrl}/model?page_size=20&page_number=1`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) throw new Error('Failed to fetch Fish Audio voices');

    const data = (await response.json()) as {
      items: Array<{ _id: string; title: string; languages: string[] }>;
    };

    return data.items.map((v) => ({
      id: v._id,
      name: v.title,
      language: v.languages?.[0] ?? 'en',
      provider: this.name,
    }));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/me`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Clone a voice from an audio sample. Returns new voice ID. */
  async cloneVoice(name: string, audioBuffer: Buffer, language = 'en'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/model`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: name,
        languages: [language],
        visibility: 'private',
        type: 'tts',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Fish Audio clone error: ${err}`);
    }

    const data = (await response.json()) as { _id: string };
    return data._id;
  }
}
