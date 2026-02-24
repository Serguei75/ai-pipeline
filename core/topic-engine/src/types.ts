// core/topic-engine/src/types.ts
// Updated: dual-channel strategy, Tier-1 markets, hook metrics

// =============================================
// ENUMS
// =============================================

export enum ChannelType {
  FUEL         = 'FUEL',         // Короткие ролики, массовый трафик
  INTELLECTUAL = 'INTELLECTUAL', // Глубокий контент, аватары, Tier-1
}

export enum ContentFormat {
  SHORT_FUEL  = 'SHORT_FUEL',  // 30–90 сек
  DEEP_ESSAY  = 'DEEP_ESSAY',  // 8–15 мин
}

export enum TopicSource {
  YOUTUBE_TRENDS = 'YOUTUBE_TRENDS',
  GOOGLE_TRENDS  = 'GOOGLE_TRENDS',
  REDDIT_API     = 'REDDIT_API',
  TWITTER_API    = 'TWITTER_API',
  TELEGRAM_API   = 'TELEGRAM_API',
  MANUAL         = 'MANUAL',
}

export enum TopicStatus {
  PENDING    = 'PENDING',
  APPROVED   = 'APPROVED',
  REJECTED   = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
}

export enum Niche {
  FINANCE    = 'FINANCE',    // CPM $15–$50 TOP
  SAAS       = 'SAAS',       // CPM $10–$25
  EDUCATION  = 'EDUCATION',  // CPM $10–$25
  HEALTH     = 'HEALTH',     // CPM $8–$15
  TECH       = 'TECH',       // CPM $8–$12
  MARKETING  = 'MARKETING',  // CPM $6–$10
  CRYPTO     = 'CRYPTO',     // CPM $5–$12
}

export enum CompetitionLevel {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

export enum ProductionStatus {
  IDEA         = 'IDEA',
  SCRIPTING    = 'SCRIPTING',
  RECORDING    = 'RECORDING',
  EDITING      = 'EDITING',
  LOCALIZATION = 'LOCALIZATION',
  REVIEW       = 'REVIEW',
  PUBLISHED    = 'PUBLISHED',
  ARCHIVED     = 'ARCHIVED',
}

// =============================================
// INTERFACES
// =============================================

export interface TopicCandidate {
  id: string;
  title: string;
  description?: string;
  channelType: ChannelType;
  contentFormat: ContentFormat;
  niche: Niche;
  source: TopicSource;
  status: TopicStatus;
  targetMarkets: string[];       // Tier-1: US, CA, AU, NO, CH, DE, GB...
  languages: string[];           // en, de, es, ja...
  estimatedCPM?: number;
  trendingScore?: number;        // 0–100
  competitionLevel?: CompetitionLevel;
  hookIdeas: string[];           // варианты хуков (0–8 сек — критически важно)
  hookScore?: number;            // 0–100
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
  channelType?: ChannelType;
  contentFormat?: ContentFormat;
  niche: Niche;
  source: TopicSource;
  targetMarkets: string[];
  languages?: string[];
  estimatedCPM?: number;
  trendingScore?: number;
  competitionLevel?: CompetitionLevel;
  hookIdeas?: string[];
  keywords?: string[];
  sourceUrl?: string;
  sourceData?: Record<string, any>;
}

export interface UpdateTopicDTO {
  title?: string;
  description?: string;
  channelType?: ChannelType;
  contentFormat?: ContentFormat;
  niche?: Niche;
  targetMarkets?: string[];
  languages?: string[];
  estimatedCPM?: number;
  hookIdeas?: string[];
  hookScore?: number;
  competitionLevel?: CompetitionLevel;
  keywords?: string[];
}

export interface TopicFilters {
  status?: TopicStatus;
  channelType?: ChannelType;
  contentFormat?: ContentFormat;
  niche?: Niche;
  source?: TopicSource;
  search?: string;
  minCPM?: number;
}

export interface GenerateTopicsOptions {
  niche: Niche;
  channelType: ChannelType;
  targetMarkets: string[];
  count?: number;
}

// Аналитика (CTV метрики из исследования)
export interface VideoMetrics {
  views: number;
  retention8sec: number;   // цель: >80%
  retention60sec: number;  // цель: >50%
  ctvShare: number;        // цель: ~45%
  ctr: number;             // цель: >4%
  rpm: number;             // цель Tier-1: >$8
  commentsPerThousand: number; // цель: >5
}
