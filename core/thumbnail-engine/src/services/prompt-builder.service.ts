import { LLMRouter } from '../../../../shared/llm/router.js';
import type { ThumbnailRequest, ThumbnailStyle } from '../types.js';

const STYLE_DESCRIPTORS: Record<ThumbnailStyle, string> = {
  dramatic:  'high drama, intense lighting, dark vignette, bold contrast, cinematic',
  clean:     'clean minimal background, large readable text, professional corporate look',
  curiosity: 'mysterious partial reveal, blurred edges, question-mark visual metaphor',
  fear:      'ominous shadow, red/dark palette, person with shocked expression, urgent warning',
  surprise:  'bright explosion of color, person with wide-open mouth, high saturation, energetic',
  desire:    'aspirational lifestyle, warm golden tones, luxury feel, aspirational subject',
};

const CTV_RULES = [
  'Optimised for 10-foot viewing distance (CTV/Smart TV)',
  'No tiny text — any text must be readable at 4-6 words max, large bold font',
  'High contrast — must stand out on dark TV backgrounds',
  'Face with clear emotional expression in foreground if applicable',
  'Rule of thirds composition',
  'No watermarks, logos, or UI elements',
  '16:9 aspect ratio, photorealistic style unless specified',
];

export interface GeneratedPrompt {
  prompt: string;
  negativePrompt: string;
  style: ThumbnailStyle;
  ctvOptimised: true;
}

let router: LLMRouter | null = null;
function getRouter(): LLMRouter {
  if (!router) {
    router = new LLMRouter({
      GEMINI_API_KEY: process.env['GEMINI_API_KEY'] ?? '',
    });
  }
  return router;
}

/**
 * Generate optimised image prompt for a thumbnail.
 * Uses Gemini 2.5 Flash-Lite (cheap, fast, structured output).
 */
export async function buildThumbnailPrompts(
  request: ThumbnailRequest,
  count = 3,
): Promise<GeneratedPrompt[]> {
  const emotionStyle = request.hookEmotion.toLowerCase() as ThumbnailStyle;
  const hasStyle = emotionStyle in STYLE_DESCRIPTORS;

  const systemPrompt = [
    'You are a world-class YouTube thumbnail art director.',
    'You create image generation prompts for Imagen 4 (Google) and GPT Image 1.5.',
    'CTV optimisation rules:\n' + CTV_RULES.map((r) => `- ${r}`).join('\n'),
    'Respond with JSON only.',
  ].join('\n');

  const userPrompt =
    `Video title: "${request.videoTitle}"\n` +
    `Hook: "${request.hookText}"\n` +
    `Primary emotion: ${request.hookEmotion}\n` +
    `Niche: ${request.niche}\n` +
    `Target market: ${request.targetMarket}\n` +
    `Channel type: ${request.channelType}\n` +
    `Available styles: ${hasStyle ? emotionStyle : 'dramatic, clean, curiosity'}\n\n` +
    `Generate ${count} DIFFERENT thumbnail image prompts. ` +
    `Each must use a different visual approach and emotional trigger. ` +
    `Make prompts highly specific and detailed (colors, lighting, composition, subject). ` +
    `Each prompt ~120-150 words. ` +
    `Return JSON array: [{prompt, negativePrompt, style, ctvOptimised: true}]`;

  const response = await getRouter().complete({
    task: 'json_extraction',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.9,
    thinkingBudget: 0,
    responseSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt:         { type: 'string' },
          negativePrompt: { type: 'string' },
          style:          { type: 'string' },
          ctvOptimised:   { type: 'boolean' },
        },
        required: ['prompt', 'negativePrompt', 'style', 'ctvOptimised'],
      },
    },
  });

  return getRouter().parseJson<GeneratedPrompt[]>(response);
}
