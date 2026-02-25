# @ai-pipeline/llm — Unified LLM Router

Single entry point for all LLM calls in the AI Pipeline system.

## Why Gemini 2.5 Flash as default?

| Model | Context | Input /1M | Output /1M | Our choice |
|-------|---------|-----------|------------|------------|
| **Gemini 2.5 Flash** | **1,048,576** | **$0.30** | **$2.50** | ✅ Default |
| Gemini 2.5 Flash-Lite | 1,048,576 | $0.10 | $0.40 | Classification |
| DeepSeek V3.2 | 64,000 | $0.28 | $0.42 | High-volume fallback |
| GPT-4.1 | 1,000,000 | $2.00 | $8.00 | ❌ 6.6× overpriced |
| Claude Sonnet 4 | 200,000 | $3.00 | $15.00 | ❌ 10× overpriced + smaller ctx |

## Usage

```typescript
import { LLMRouter } from '@ai-pipeline/llm';

const llm = new LLMRouter({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY, // optional
});

// Generate script (uses Gemini 2.5 Flash, 1M context)
const result = await llm.complete({
  task: 'script_generation',
  messages: [
    { role: 'system', content: 'You are a YouTube script writer...' },
    { role: 'user', content: 'Write a script about...' },
  ],
  temperature: 0.8,
});

// Extract structured JSON (uses Gemini 2.5 Flash-Lite, cheaper)
const result = await llm.complete({
  task: 'json_extraction',
  messages: [{ role: 'user', content: 'Extract data from...' }],
  responseSchema: { type: 'object', properties: { ... } },
  thinkingBudget: 0, // disable thinking for simple extraction
});
const data = llm.parseJson(result);

// Cost estimation before calling
const estimatedCost = llm.estimateCost('script_generation', 5000, 2000);
console.log(`Estimated: $${estimatedCost.toFixed(5)}`);
```

## Task → Model Mapping

| Task | Primary Model | Fallback | Why |
|------|--------------|---------|-----|
| `script_generation` | Gemini 2.5 Flash | — | Reasoning + long context for style consistency |
| `hook_generation` | Gemini 2.5 Flash | — | Creative + all previous hooks as context |
| `analytics_report` | Gemini 2.5 Flash | DeepSeek | Full month metrics in one prompt |
| `classification` | Gemini 2.5 Flash-Lite | Flash | Fast, cheap, 100% JSON validity |
| `json_extraction` | Gemini 2.5 Flash-Lite | Flash | Structured output, minimal cost |
| `long_context` | Gemini 2.5 Flash | — | Up to 1M tokens |
| `bulk_batch` | Gemini 2.5 Flash | DeepSeek | Use Batch API for -50% |

## Batch API (−50% cost)

For non-realtime tasks (analytics, evals, offline scripts):
→ Use Gemini Batch API directly — **50% discount on Flash pricing**.
→ Effective cost: $0.15/M input, $1.25/M output.
