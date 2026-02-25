/**
 * Cost Tracker — type definitions
 *
 * Every cost event in the pipeline is captured here:
 *   LLM      — Gemini 2.5 Flash / Flash-Lite / DeepSeek V3.2 tokens
 *   TTS      — Google TTS / Fish Audio / Kokoro characters
 *   Media    — HeyGen avatar minutes, Pexels API calls
 *   Image    — Imagen 4 / GPT Image 1.5 per image
 *   Storage  — GCS bytes stored / egress
 *   YouTube  — API quota units (for budget tracking)
 */

export type CostCategory =
  | 'llm_input'
  | 'llm_output'
  | 'tts_chars'
  | 'media_minutes'
  | 'image_generation'
  | 'storage'
  | 'api_quota';

export type CostProvider =
  | 'gemini-flash'
  | 'gemini-flash-lite'
  | 'deepseek-v3'
  | 'google-tts'
  | 'fish-audio'
  | 'kokoro-hf'
  | 'heygen'
  | 'imagen4-fast'
  | 'imagen4-standard'
  | 'imagen4-ultra'
  | 'gpt-image-1.5'
  | 'gcs'
  | 'youtube-api';

export interface CostEvent {
  id: string;
  videoId: string;
  channelId: string;
  category: CostCategory;
  provider: CostProvider;
  /** Raw unit consumed (tokens, chars, seconds, images, bytes) */
  units: number;
  unitLabel: string;
  costUsd: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VideoCostBreakdown {
  videoId: string;
  videoTitle: string;
  channelId: string;
  status: 'in_progress' | 'completed' | 'published';
  costs: {
    llmTotal: number;
    ttsTotal: number;
    mediaTotal: number;
    imageTotal: number;
    storageTotal: number;
    other: number;
    total: number;
  };
  events: CostEvent[];
  revenueUsd: number | null;
  roiPercent: number | null;
  profitUsd: number | null;
  costPerView: number | null;
  updatedAt: string;
}

export interface ChannelCostSummary {
  channelId: string;
  periodDays: number;
  totalCostUsd: number;
  totalRevenueUsd: number;
  totalProfitUsd: number;
  avgCostPerVideo: number;
  avgRevenuePerVideo: number;
  avgRoiPercent: number;
  videoCount: number;
  breakdownByCategory: Record<CostCategory, number>;
  breakdownByProvider: Partial<Record<CostProvider, number>>;
  mostExpensiveVideos: Array<{ videoId: string; title: string; costUsd: number }>;
  mostProfitableVideos: Array<{ videoId: string; title: string; profitUsd: number }>;
  generatedAt: string;
}

/** Unit pricing table — update when provider prices change */
export const UNIT_PRICING: Record<string, number> = {
  // LLM — per 1M tokens
  'gemini-flash:input':       0.30,
  'gemini-flash:output':      2.50,
  'gemini-flash-lite:input':  0.10,
  'gemini-flash-lite:output': 0.40,
  'deepseek-v3:input':        0.28,
  'deepseek-v3:output':       0.42,
  // TTS — per 1M characters
  'google-tts:chars':         0.016,   // Neural2 voices
  'fish-audio:chars':         0.012,
  'kokoro-hf:chars':          0,        // free
  // Media — per minute of avatar video
  'heygen:minutes':           0.50,
  // Images — per image
  'imagen4-fast:image':       0.02,
  'imagen4-standard:image':   0.04,
  'imagen4-ultra:image':      0.06,
  'gpt-image-1.5:image':      0.04,
  // Storage — per GB/month (GCS Standard)
  'gcs:gb_month':             0.020,
};
