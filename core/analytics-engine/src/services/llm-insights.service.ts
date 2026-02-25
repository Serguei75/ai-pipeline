/**
 * LLM Insights Service for Analytics Engine
 * Uses Gemini 2.5 Flash to generate actionable AI insights from metrics.
 *
 * Key capability: pass ENTIRE month of metrics data in ONE call (1M context).
 * No chunking, no summarisation loss — full picture in every analysis.
 */
import { LLMRouter } from '../../../../shared/llm/router.js';
import type { LLMMessage } from '../../../../shared/llm/types.js';

export interface HookInsight {
  videoId: string;
  videoTitle: string;
  hookText: string;
  hookEmotion: string;
  retentionAt8sec: number;
  verdict: 'STRONG' | 'WEAK' | 'CRITICAL';
  improvementSuggestion: string;
  suggestedRewrittenHook: string;
}

export interface NicheInsight {
  niche: string;
  actualRPM: number;
  benchmarkRPM: number;
  gapPercent: number;
  rootCauseHypothesis: string;
  recommendations: string[];
  shouldDouble: boolean;
  shouldReduce: boolean;
}

export interface ChannelInsightReport {
  generatedAt: string;
  hookInsights: HookInsight[];
  nicheInsights: NicheInsight[];
  topWinningPatterns: string[];
  topRisks: string[];
  nextSprintPriorities: string[];
  estimatedRevenueImpact: string;
}

let routerInstance: LLMRouter | null = null;

function getRouter(): LLMRouter {
  if (!routerInstance) {
    routerInstance = new LLMRouter({
      GEMINI_API_KEY: process.env['GEMINI_API_KEY'] ?? '',
      DEEPSEEK_API_KEY: process.env['DEEPSEEK_API_KEY'],
    });
  }
  return routerInstance;
}

/**
 * Generate full channel insights report from raw metrics.
 * All data passed in a single 1M-context Gemini 2.5 Flash call.
 */
export async function generateChannelInsights(
  metricsJson: string,  // serialised VideoMetric[], NicheBenchmark[], ChannelSnapshot[]
  channelType: 'FUEL' | 'INTELLECTUAL',
  periodDays: number,
): Promise<ChannelInsightReport> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        'You are a senior YouTube analytics strategist. ' +
        'You analyse channel performance data and provide precise, actionable insights. ' +
        'Focus on: hook retention (first 8 sec), CPM by niche vs Tier-1 benchmarks, CTV share. ' +
        'Be specific — give concrete numbers and concrete next actions. ' +
        'Respond with JSON only.',
    },
    {
      role: 'user',
      content:
        `Analyse the following ${channelType} channel data for the last ${periodDays} days.\n\n` +
        `METRICS DATA (full dataset):\n${metricsJson}\n\n` +
        `Return a ChannelInsightReport JSON with:\n` +
        `- hookInsights: array of per-video hook analysis (verdict STRONG/WEAK/CRITICAL, rewrite suggestion)\n` +
        `- nicheInsights: per-niche RPM vs benchmark gap + recommendations\n` +
        `- topWinningPatterns: top 3 patterns that explain the best-performing videos\n` +
        `- topRisks: top 3 risks or underperforming areas\n` +
        `- nextSprintPriorities: 3-5 concrete actions for next 2 weeks\n` +
        `- estimatedRevenueImpact: string describing potential revenue change if priorities are executed`,
    },
  ];

  const response = await getRouter().complete({
    task: 'analytics_report',
    messages,
    temperature: 0.3, // low temp for analytical tasks
    thinkingBudget: 8192,
    maxTokens: 16384,
  });

  const parsed = getRouter().parseJson<ChannelInsightReport>(response);
  return { ...parsed, generatedAt: new Date().toISOString() };
}

/**
 * Quick hook analysis for a single video (real-time, called from Community Engine feedback loop).
 */
export async function analyzeWeakHook(
  hookText: string,
  hookEmotion: string,
  retentionAt8sec: number,
  videoTitle: string,
  niche: string,
): Promise<{ verdict: string; analysis: string; rewrite: string; improvedEmotion: string }> {
  const messages: LLMMessage[] = [
    {
      role: 'user',
      content:
        `Video: "${videoTitle}" (niche: ${niche})\n` +
        `Hook: "${hookText}" (emotion: ${hookEmotion})\n` +
        `Retention@8sec: ${retentionAt8sec}% (target: >50%)\n\n` +
        `Why did this hook fail? Provide a specific rewrite and the optimal emotion trigger. ` +
        `Return JSON: {verdict, analysis, rewrite, improvedEmotion}`,
    },
  ];

  const response = await getRouter().complete({
    task: 'analytics_report',
    messages,
    temperature: 0.5,
    thinkingBudget: 1024, // small budget for quick analysis
  });

  return getRouter().parseJson(response);
}
