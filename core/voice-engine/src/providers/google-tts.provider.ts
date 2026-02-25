import type { TTSProvider, TTSOptions, VoiceInfo } from './provider.interface.js';

/**
 * Google Cloud Text-to-Speech
 * Free tier: 1M chars/month Neural2/WaveNet FOREVER (not just first year)
 * Standard voices: 4M chars/month free forever
 * Neural2: $16/1M after free tier — lowest cost for prod standard voice
 */
export class GoogleTTSProvider implements TTSProvider {
  name = 'google-tts';
  private readonly baseUrl = 'https://texttospeech.googleapis.com/v1';

  constructor(private readonly apiKey: string) {}

  async synthesize(text: string, voiceId: string, options?: TTSOptions): Promise<Buffer> {
    const [languageCode, voiceName] = this.parseVoiceId(voiceId);

    const response = await fetch(
      `${this.baseUrl}/text:synthesize?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, name: voiceName },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: options?.speed ?? 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google TTS error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { audioContent: string };
    return Buffer.from(data.audioContent, 'base64');
  }

  async getVoices(): Promise<VoiceInfo[]> {
    const response = await fetch(`${this.baseUrl}/voices?key=${this.apiKey}`);
    if (!response.ok) throw new Error('Failed to fetch Google TTS voices');

    const data = (await response.json()) as {
      voices: Array<{ name: string; languageCodes: string[]; ssmlGender: string }>;
    };

    return data.voices.map((v) => ({
      id: `${v.languageCodes[0]}|${v.name}`,
      name: v.name,
      language: v.languageCodes[0],
      gender: v.ssmlGender.toLowerCase(),
      provider: this.name,
    }));
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getVoices();
      return true;
    } catch {
      return false;
    }
  }

  private parseVoiceId(voiceId: string): [string, string] {
    const parts = voiceId.split('|');
    if (parts.length === 2) return [parts[0], parts[1]];
    return ['en-US', 'en-US-Neural2-D'];
  }
}
