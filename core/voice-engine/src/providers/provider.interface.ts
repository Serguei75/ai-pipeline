export interface TTSProvider {
  name: string;
  synthesize(text: string, voiceId: string, options?: TTSOptions): Promise<Buffer>;
  getVoices(): Promise<VoiceInfo[]>;
  isAvailable(): Promise<boolean>;
}

export interface TTSOptions {
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  language?: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender?: string;
  provider?: string;
}
