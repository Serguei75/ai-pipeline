// core/topic-engine/src/types.ts

export enum TopicSource {
  YOUTUBE_TRENDS = 'YOUTUBE_TRENDS',
  GOOGLE_TRENDS = 'GOOGLE_TRENDS',
  REDDIT_API = 'REDDIT_API',
  TWITTER_API = 'TWITTER_API',
  TELEGRAM_API = 'TELEGRAM_API',
  MANUAL = 'MANUAL',
}

export enum TopicStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export enum Niche {
  TECH = 'TECH',
  FINANCE = 'FINANCE',
  SAAS = 'SAAS',
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  CRYPTO = 'CRYPTO',
  MARKETING = 'MARKETING',
}

export interface TopicCandidate {
  id: string;
  title: string;
  description?: string;
  niche: Niche;
  source: TopicSource;
  status: TopicStatus;
  targetMarkets: string[];
  forShort: boolean;
  forDeep: boolean;
  trendingScore?: number;
  estimatedCPM?: number;
  keywords: string[];
  sourceUrl?: string;
  sourceData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface CreateTopicDTO {
  title: string;
  description?: string;
  niche: Niche;
  source: TopicSource;
  targetMarkets: string[];
  forShort?: boolean;
  forDeep?: boolean;
  keywords?: string[];
  sourceUrl?: string;
  sourceData?: Record<string, any>;
}

export interface UpdateTopicDTO {
  title?: string;
  description?: string;
  niche?: Niche;
  targetMarkets?: string[];
  forShort?: boolean;
  forDeep?: boolean;
  keywords?: string[];
}

export interface TopicFilters {
  status?: TopicStatus;
  niche?: Niche;
  source?: TopicSource;
  forShort?: boolean;
  forDeep?: boolean;
  search?: string;
}
