// shared/config/markets.ts
// Tier-1 рынки и CPM данные из исследования

export const TIER1_MARKETS = [
  { code: 'NO', name: 'Norway',      cpmUsd: 43, priority: 1 },
  { code: 'AU', name: 'Australia',   cpmUsd: 36, priority: 2 },
  { code: 'US', name: 'USA',         cpmUsd: 32, priority: 3 },
  { code: 'CH', name: 'Switzerland', cpmUsd: 23, priority: 4 },
  { code: 'CA', name: 'Canada',      cpmUsd: 18, priority: 5 },
  { code: 'DE', name: 'Germany',     cpmUsd: 15, priority: 6 },
  { code: 'GB', name: 'UK',          cpmUsd: 13, priority: 7 },
  { code: 'SE', name: 'Sweden',      cpmUsd: 12, priority: 8 },
  { code: 'DK', name: 'Denmark',     cpmUsd: 11, priority: 9 },
  { code: 'JP', name: 'Japan',       cpmUsd: 9,  priority: 10 },
  { code: 'FR', name: 'France',      cpmUsd: 8,  priority: 11 },
  { code: 'ES', name: 'Spain',       cpmUsd: 3,  priority: 12 },
] as const;

export const TOP_NICHES_CPM = [
  { niche: 'FINANCE',   cpmMin: 15, cpmMax: 50, label: 'Финансы и инвестиции' },
  { niche: 'SAAS',      cpmMin: 10, cpmMax: 25, label: 'SaaS / Программное обеспечение' },
  { niche: 'EDUCATION', cpmMin: 10, cpmMax: 25, label: 'Онлайн-образование' },
  { niche: 'HEALTH',    cpmMin: 8,  cpmMax: 15, label: 'Здоровье' },
  { niche: 'TECH',      cpmMin: 8,  cpmMax: 12, label: 'Технологии' },
  { niche: 'MARKETING', cpmMin: 6,  cpmMax: 10, label: 'Маркетинг' },
  { niche: 'CRYPTO',    cpmMin: 5,  cpmMax: 12, label: 'Крипто' },
] as const;

// Языки по доходности
export const LANGUAGES_BY_MONETIZATION = [
  { code: 'en', name: 'English',    cpmBase: 10, tier: 1 },
  { code: 'de', name: 'German',     cpmBase: 6,  tier: 1 },
  { code: 'sv', name: 'Swedish',    cpmBase: 5,  tier: 1 },
  { code: 'no', name: 'Norwegian',  cpmBase: 5,  tier: 1 },
  { code: 'ja', name: 'Japanese',   cpmBase: 4,  tier: 2 },
  { code: 'fr', name: 'French',     cpmBase: 4,  tier: 2 },
  { code: 'es', name: 'Spanish',    cpmBase: 3,  tier: 2 },
] as const;

// Ключевые метрики из исследования
export const CONTENT_BENCHMARKS = {
  // CTV
  ctvWatchTimeShare: 0.45,         // 45% просмотров с телевизоров
  ctvRetentionTarget: 0.95,         // retention на CTV до 95%

  // Retention пороги
  hookWindowSec: 8,                 // решение смотреть/нет — первые 8 сек
  criticalDropSec: 60,              // к 60-й сек уходит 55% аудитории
  aiSlopRetentionPenalty: 0.70,     // AI-slop удержание на 70% ниже

  // Хорошие показатели
  minRetentionAt8sec: 0.80,
  minRetentionAt60sec: 0.50,
  minCtr: 0.04,
  minRpmTier1: 8.0,
  minCommentsPerThousandViews: 5,

  // Комментарии
  commentsGrowthRate: 0.38,         // рост числа комментариев +38%
};

export type MarketCode = typeof TIER1_MARKETS[number]['code'];
export type Language = typeof LANGUAGES_BY_MONETIZATION[number]['code'];
