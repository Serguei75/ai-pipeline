import type { LLMProvider, LLMRequest, LLMResponse, ProviderName } from '../types.js';
import { MODEL_CONFIG, type ModelKey } from '../config.js';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
    thinkingConfig?: { thinkingBudget: number };
  };
}

interface GeminiApiResponse {
  candidates: Array<{
    content: { parts: Array<{ text?: string }> };
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name: ProviderName;
  private readonly cfg: (typeof MODEL_CONFIG)[ModelKey];
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(
    private readonly apiKey: string,
    providerKey: 'gemini-flash' | 'gemini-flash-lite',
  ) {
    this.name = providerKey;
    this.cfg = MODEL_CONFIG[providerKey];
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const systemMsg = request.messages.find((m) => m.role === 'system');
    const convoMsgs = request.messages.filter((m) => m.role !== 'system');

    const contents: GeminiContent[] = convoMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: GeminiRequestBody = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192,
      },
    };

    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    if (request.responseSchema) {
      body.generationConfig!.responseMimeType = 'application/json';
      body.generationConfig!.responseSchema = request.responseSchema;
    }

    if (request.thinkingBudget !== undefined && this.cfg.supportsThinking) {
      body.generationConfig!.thinkingConfig = { thinkingBudget: request.thinkingBudget };
    }

    const url = `${this.baseUrl}/${this.cfg.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API ${response.status}: ${err.substring(0, 300)}`);
    }

    const data = (await response.json()) as GeminiApiResponse;
    const text = data.candidates[0].content.parts
      .filter((p) => p.text)
      .map((p) => p.text!)
      .join('');

    const inputCost = (data.usageMetadata.promptTokenCount / 1_000_000) * this.cfg.inputPricePerM;
    const outputCost = (data.usageMetadata.candidatesTokenCount / 1_000_000) * this.cfg.outputPricePerM;

    return {
      content: text,
      model: this.cfg.model,
      provider: this.name,
      usage: {
        inputTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount,
        estimatedCostUsd: inputCost + outputCost,
      },
    };
  }
}
