// shared/types/index.ts
// Общие типы для всего ai-pipeline монорепозитория

export enum ChannelType {
  FUEL         = 'FUEL',          // Топливный: 30–90 сек, массовый трафик
  INTELLECTUAL = 'INTELLECTUAL',  // Интеллектуальный: 8–15 мин, аватары, глубина
}

export enum ContentFormat {
  SHORT_FUEL  = 'SHORT_FUEL',   // 30–90 сек, хук + 2–3 факта + CTA
  DEEP_ESSAY  = 'DEEP_ESSAY',   // 8–15 мин, структурированный разбор
}

export enum ProductionStatus {
  IDEA        = 'IDEA',
  SCRIPTING   = 'SCRIPTING',
  RECORDING   = 'RECORDING',
  EDITING     = 'EDITING',
  LOCALIZATION = 'LOCALIZATION',
  REVIEW      = 'REVIEW',
  PUBLISHED   = 'PUBLISHED',
  ARCHIVED    = 'ARCHIVED',
}

export enum CompetitionLevel {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

// Tier-1 рынки с высоким CPM
export type TierMarket = 'US' | 'CA' | 'AU' | 'NO' | 'CH' | 'DE' | 'GB' | 'SE' | 'DK' | 'JP' | 'FR' | 'ES';

export interface HookAnalysis {
  hookText: string;       // текст хука (0–8 сек)
  hookScore: number;      // оценка силы хука 0–100
  emotionType: 'CURIOSITY' | 'FEAR' | 'SURPRISE' | 'DESIRE' | 'URGENCY';
  visualSuggestion: string;
}

export interface ContentEconomics {
  estimatedProductionCost: number;  // $
  estimatedCPM: number;             // $ per 1000 views
  breakEvenViews: number;           // сколько просмотров для окупаемости
  estimatedMonthlyRevenue?: number; // прогноз при стабильных просмотрах
}
