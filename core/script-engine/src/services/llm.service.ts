/**
 * LLM Service for Script Engine
 * Replaces openai.service.ts — now routes through unified LLMRouter.
 *
 * WHY Gemini 2.5 Flash:
 * - 1M context: pass ALL previously approved scripts as style reference
 * - $0.30/M input — same price as before but 10× more context than GPT-4
 * - Excellent at structured JSON output (script segments, hook variants)
 */
import { LLMRouter } from '../../../../shared/llm/router.js';
import type { LLMMessage } from '../../../../shared/llm/types.js';

export type ScriptFormat = 'SHORT_FUEL' | 'DEEP_ESSAY';
export type HookEmotion = 'FEAR' | 'CURIOSITY' | 'SURPRISE' | 'DESIRE' | 'URGENCY';

export interface GeneratedHook {
  emotion: HookEmotion;
  hookText: string;
  rationale: string;
  estimatedRetentionScore: number;
}

export interface GeneratedScript {
  title: string;
  hookText: string;
  hookEmotion: HookEmotion;
  estimatedDuration: number;
  segments: Array<{
    type: 'HOOK' | 'AVATAR' | 'BROLL' | 'CALLOUT' | 'CTA';
    text: string;
    durationSec: number;
    visualNote?: string;
  }>;
  brollKeywords: string[];
  ctaText: string;
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
 * Generate 5 hook variants for a given topic.
 * Passes all context about the topic + target market.
 */
export async function generateHooks(
  topicTitle: string,
  topicDescription: string,
  targetMarket: string,
  channelType: 'FUEL' | 'INTELLECTUAL',
  previousHooks?: string[],
): Promise<GeneratedHook[]> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert YouTube hook writer. You create opening lines that maximise ' +
        'retention in the first 8 seconds. Respond with valid JSON only.',
    },
    {
      role: 'user',
      content:
        `Topic: "${topicTitle}"\n` +
        `Description: ${topicDescription}\n` +
        `Target market: ${targetMarket}\n` +
        `Channel type: ${channelType} (${channelType === 'FUEL' ? '30-90 sec shorts' : '8-15 min educational'})\n` +
        (previousHooks?.length
          ? `Previous hooks to avoid repetition:\n${previousHooks.slice(-10).join('\n')}\n`
          : '') +
        `\nGenerate 5 hook variants — one for each emotion: FEAR, CURIOSITY, SURPRISE, DESIRE, URGENCY.` +
        `\nReturn JSON array: [{emotion, hookText, rationale, estimatedRetentionScore (0-100)}]`,
    },
  ];

  const response = await getRouter().complete({
    task: 'hook_generation',
    messages,
    temperature: 0.85,
    thinkingBudget: 2048,
    responseSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          emotion: { type: 'string' },
          hookText: { type: 'string' },
          rationale: { type: 'string' },
          estimatedRetentionScore: { type: 'number' },
        },
        required: ['emotion', 'hookText', 'rationale', 'estimatedRetentionScore'],
      },
    },
  });

  return getRouter().parseJson<GeneratedHook[]>(response);
}

/**
 * Generate a full video script.
 * Leverages Gemini 2.5 Flash's 1M context to pass ALL previous approved scripts
 * as style reference — this ensures tone and format consistency across the channel.
 */
export async function generateScript(
  topicTitle: string,
  topicDescription: string,
  hookText: string,
  hookEmotion: HookEmotion,
  format: ScriptFormat,
  targetMarket: string,
  approvedScriptsContext?: string, // up to 1M tokens of previous scripts!
): Promise<GeneratedScript> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        'You are an elite YouTube script writer specializing in retention-optimised content. ' +
        'You write for CTV audiences: clear structure, no filler, strong hook. ' +
        'Avoid AI-sounding phrases. Sound like a knowledgeable human. Respond with JSON only.',
    },
  ];

  // If we have previous scripts, add them as context (this is the 1M ctx killer feature)
  if (approvedScriptsContext) {
    messages.push({
      role: 'user',
      content:
        'Here are previously approved scripts from this channel. ' +
        'Study the tone, structure, and style carefully:\n\n' +
        approvedScriptsContext,
    });
    messages.push({
      role: 'assistant',
      content: 'I have studied the channel style. I will match the tone and format precisely.',
    });
  }

  const durationGuide =
    format === 'SHORT_FUEL'
      ? '30-90 seconds total (Shorts/Reels format)'
      : '8-15 minutes (long-form educational CTV format)';

  messages.push({
    role: 'user',
    content:
      `Write a ${format} script for:\n` +
      `Topic: "${topicTitle}"\n` +
      `Description: ${topicDescription}\n` +
      `Hook: "${hookText}" (emotion: ${hookEmotion})\n` +
      `Target market: ${targetMarket}\n` +
      `Duration: ${durationGuide}\n\n` +
      `Return JSON with: title, hookText, hookEmotion, estimatedDuration (seconds), ` +
      `segments ([{type, text, durationSec, visualNote}]), brollKeywords, ctaText.\n` +
      `Segment types: HOOK | AVATAR | BROLL | CALLOUT | CTA`,
  });

  const response = await getRouter().complete({
    task: 'script_generation',
    messages,
    temperature: 0.8,
    thinkingBudget: 4096,
  });

  return getRouter().parseJson<GeneratedScript>(response);
}
