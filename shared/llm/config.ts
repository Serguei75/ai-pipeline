import type { TaskType, ProviderName } from './types.js';

/**
 * Model configuration with pricing (Feb 2026).
 *
 * WHY Gemini 2.5 Flash as default:
 * - 1,048,576 token context (1M) — largest flat-rate context window available
 * - $0.30/M input — no price jump after 200k (unlike Gemini Pro and most competitors)
 * - Excellent JSON-mode reliability (100% syntactic validity in benchmarks)
 * - GPT-4.1 at same context: $2.00/M input (6.6× more expensive)
 * - Claude Sonnet 4: 200k max context, $3/M (10× more expensive, smaller window)
 */
export const MODEL_CONFIG = {
  'gemini-flash': {
    model: 'gemini-2.5-flash',
    contextWindow: 1_048_576,
    inputPricePerM: 0.30,
    outputPricePerM: 2.50,
    supportsThinking: true,
    note: 'Default for everything. 1M context, flat rate.',
  },
  'gemini-flash-lite': {
    model: 'gemini-2.5-flash-lite',
    contextWindow: 1_048_576,
    inputPricePerM: 0.10,
    outputPricePerM: 0.40,
    supportsThinking: false,
    note: 'Classification, JSON extraction, comment analysis at minimal cost.',
  },
  'deepseek': {
    model: 'deepseek-chat',
    contextWindow: 64_000,
    inputPricePerM: 0.28,
    outputPricePerM: 0.42,
    supportsThinking: false,
    note: 'Fallback for high-volume tasks where context < 64k. Cheapest output tokens.',
  },
} as const;

export type ModelKey = keyof typeof MODEL_CONFIG;

/**
 * Routing table: task → primary provider → optional fallback.
 *
 * Key insight: Gemini 2.5 Flash handles 99% of tasks better per dollar
 * than any competitor at 1M context. Only exception: pure-volume tasks
 * where context < 64k AND we need maximum output-token savings → DeepSeek.
 */
export const ROUTING_TABLE: Record<
  TaskType,
  { primary: ModelKey; fallback?: ModelKey }
> = {
  script_generation:  { primary: 'gemini-flash' },
  hook_generation:    { primary: 'gemini-flash' },
  analytics_report:  { primary: 'gemini-flash',      fallback: 'deepseek' },
  classification:    { primary: 'gemini-flash-lite', fallback: 'gemini-flash' },
  json_extraction:   { primary: 'gemini-flash-lite', fallback: 'gemini-flash' },
  long_context:      { primary: 'gemini-flash' },
  bulk_batch:        { primary: 'gemini-flash',      fallback: 'deepseek' },
};
