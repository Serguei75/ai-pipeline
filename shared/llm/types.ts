/**
 * Task types drive model selection.
 * Add a new TaskType here when a new pipeline step needs LLM.
 */
export type TaskType =
  | 'script_generation'   // Script Engine: full video script (needs reasoning + long context)
  | 'hook_generation'     // Script Engine: 5 hook variants per emotion
  | 'analytics_report'   // Analytics Engine: insights from metrics
  | 'classification'      // Community Engine: comment classification
  | 'json_extraction'     // Any module: structured data extraction
  | 'long_context'        // Any task that needs > 64k tokens of context
  | 'bulk_batch';         // Offline batch tasks (use Batch API for -50% cost)

export type ProviderName = 'gemini-flash' | 'gemini-flash-lite' | 'deepseek';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  task: TaskType;
  messages: LLMMessage[];
  /** JSON Schema for guaranteed structured output */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  /**
   * Gemini 2.5 Flash thinking budget (tokens).
   * Set to 0 to disable thinking (faster + cheaper for simple tasks).
   * Omit to let the model decide.
   */
  thinkingBudget?: number;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  /** Estimated cost in USD based on current pricing */
  estimatedCostUsd: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: ProviderName;
  usage: LLMUsage;
}

export interface LLMProvider {
  readonly name: ProviderName;
  complete(request: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}
