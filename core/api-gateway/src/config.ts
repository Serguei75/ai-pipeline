export interface ServiceConfig {
  name: string
  url: string
  description: string
  port: number
}

export const SERVICES: Record<string, ServiceConfig> = {
  topics: {
    name: 'topic-engine',
    url: process.env.TOPIC_ENGINE_URL || 'http://localhost:3001',
    description: 'Trend discovery, niche CPM scoring, hook ideas',
    port: 3001,
  },
  scripts: {
    name: 'script-engine',
    url: process.env.SCRIPT_ENGINE_URL || 'http://localhost:3002',
    description: 'AI script generation (SHORT/FUEL + DEEP/Intellectual)',
    port: 3002,
  },
  voice: {
    name: 'voice-engine',
    url: process.env.VOICE_ENGINE_URL || 'http://localhost:3003',
    description: 'ElevenLabs TTS, multi-language audio generation',
    port: 3003,
  },
  media: {
    name: 'media-engine',
    url: process.env.MEDIA_ENGINE_URL || 'http://localhost:3004',
    description: 'HeyGen avatars, Pexels B-roll, FFmpeg assembly',
    port: 3004,
  },
  analytics: {
    name: 'analytics-engine',
    url: process.env.ANALYTICS_ENGINE_URL || 'http://localhost:3005',
    description: 'YouTube API, CPM/RPM, hook retention, ROI',
    port: 3005,
  },
  community: {
    name: 'community-engine',
    url: process.env.COMMUNITY_ENGINE_URL || 'http://localhost:3006',
    description: 'Comment classification, AI reply drafts',
    port: 3006,
  },
  localization: {
    name: 'localization-engine',
    url: process.env.LOCALIZATION_ENGINE_URL || 'http://localhost:3007',
    description: 'Subtitles + AI dubbing, multi-audio packages',
    port: 3007,
  },
}
