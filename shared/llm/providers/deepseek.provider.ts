import type { LLMProvider, LLMRequest, LLMResponse } from '../types.js';
import { MODEL_CONFIG } from '../config.js';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

/**
 * DeepSeek V3.2 provider (OpenAI-compatible API).
 * Pricing: $0.28/M input (cache miss), $0.42/M output.
 * Context: 64k tokens.
 * Best for: high-volume tasks where context fits in 64k and output volume is large.
 */
export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek' as const;
  private readonly cfg = MODEL_CONFIG.deepseek;

  constructor(private readonly apiKey: string) {}

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const messages: DeepSeekMessage[] = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 8192,
    };

    // DeepSeek supports json_object mode (not full JSON Schema)
    if (request.responseSchema) {
      body['response_format'] = { type: 'json_object' };
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${err.substring(0, 300)}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const usage = data.usage;
    const inputCost = (usage.prompt_tokens / 1_000_000) * this.cfg.inputPricePerM;
    const outputCost = (usage.completion_tokens / 1_000_000) * this.cfg.outputPricePerM;

    return {
      content: data.choices[0].message.content,
      model: this.cfg.model,
      provider: this.name,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        estimatedCostUsd: inputCost + outputCost,
      },
    };
  }
}
