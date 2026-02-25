import type { LLMProvider, LLMRequest, LLMResponse, TaskType } from './types.js';
import type { ModelKey } from './config.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import { ROUTING_TABLE, MODEL_CONFIG } from './config.js';

export interface LLMRouterConfig {
  /** Required. Gemini 2.5 Flash covers 99% of tasks at 1M context, $0.30/M. */
  GEMINI_API_KEY: string;
  /** Optional. DeepSeek V3.2: ultra-cheap fallback for high-volume tasks < 64k context. */
  DEEPSEEK_API_KEY?: string;
}

/**
 * LLM Router — unified model selection for the entire AI Pipeline.
 *
 * Architecture decision:
 *   Gemini 2.5 Flash = default for ALL tasks.
 *   Reason: 1M token context at $0.30/M flat rate. No competitor matches this.
 *   - GPT-4.1:       same context, $2.00/M (6.6× more expensive)
 *   - Claude Sonnet: 200k max context, $3/M (10× more expensive + smaller window)
 *   - DeepSeek V3.2: 64k context, $0.28/M (cheaper, but 16× less context)
 *
 * Usage:
 *   const llm = new LLMRouter({ GEMINI_API_KEY });
 *   const result = await llm.complete({ task: 'script_generation', messages });
 */
export class LLMRouter {
  private readonly providers = new Map<ModelKey, LLMProvider>();

  constructor(config: LLMRouterConfig) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('LLMRouter: GEMINI_API_KEY is required');
    }

    this.providers.set('gemini-flash', new GeminiProvider(config.GEMINI_API_KEY, 'gemini-flash'));
    this.providers.set('gemini-flash-lite', new GeminiProvider(config.GEMINI_API_KEY, 'gemini-flash-lite'));

    if (config.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', new DeepSeekProvider(config.DEEPSEEK_API_KEY));
    }
  }

  /**
   * Complete a request using the optimal model for the given task.
   * Falls back to secondary provider automatically on failure.
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const route = ROUTING_TABLE[request.task];
    if (!route) throw new Error(`Unknown task type: "${request.task}"`);

    const primary = this.providers.get(route.primary);
    const fallback = route.fallback ? this.providers.get(route.fallback) : undefined;

    const provider = primary?.isAvailable() ? primary : fallback;
    if (!provider) {
      throw new Error(`No available provider for task "${request.task}". Check API keys.`);
    }

    console.info(
      `[LLMRouter] task=${request.task} provider=${provider.name} model=${MODEL_CONFIG[provider.name as ModelKey].model}`
    );

    try {
      const result = await provider.complete(request);
      console.info(
        `[LLMRouter] done provider=${result.provider} ` +
        `in=${result.usage.inputTokens} out=${result.usage.outputTokens} ` +
        `cost=$${result.usage.estimatedCostUsd.toFixed(5)}`
      );
      return result;
    } catch (err) {
      if (fallback && fallback !== provider && fallback.isAvailable()) {
        console.warn(`[LLMRouter] Primary failed, falling back to ${fallback.name}`);
        return fallback.complete(request);
      }
      throw err;
    }
  }

  /**
   * Parse JSON from LLM response.
   * Handles markdown code blocks that some models include even with JSON mode.
   */
  parseJson<T>(response: LLMResponse): T {
    let text = response.content.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    }
    return JSON.parse(text) as T;
  }

  /** Get model metadata for a given task (for logging / cost estimation). */
  getModelInfo(task: TaskType) {
    const route = ROUTING_TABLE[task];
    if (!route) return null;
    return { ...MODEL_CONFIG[route.primary], providerKey: route.primary };
  }

  /** Estimate cost before making the call. */
  estimateCost(task: TaskType, inputTokens: number, outputTokens: number): number {
    const info = this.getModelInfo(task);
    if (!info) return 0;
    return (
      (inputTokens / 1_000_000) * info.inputPricePerM +
      (outputTokens / 1_000_000) * info.outputPricePerM
    );
  }
}
