import type { PrismaClient } from '@prisma/client'
import type { OpenAIService } from './openai.service.js'
import { buildHookUserPrompt, HOOK_SYSTEM_PROMPT } from '../prompts/hook.prompt.js'
import { logger } from '../logger.js'

interface GenerateHooksParams {
  scriptId: string
  topicTitle: string
  niche: string
  targetMarkets: string[]
  keywords: string[]
  contentFormat: string
}

interface RawHook {
  hookText: string
  emotionType: string
  visualSuggestion: string
  audioSuggestion?: string
  score: number
}

export class HookService {
  constructor(
    private readonly db: PrismaClient,
    private readonly openai: OpenAIService,
  ) {}

  async generateHooks(params: GenerateHooksParams): Promise<{ count: number }> {
    logger.info({ scriptId: params.scriptId, topic: params.topicTitle }, 'Generating hook variants')

    const { content, tokensUsed } = await this.openai.complete(
      HOOK_SYSTEM_PROMPT,
      buildHookUserPrompt(params),
    )

    let parsed: { hooks: RawHook[] }
    try {
      parsed = JSON.parse(content) as { hooks: RawHook[] }
    } catch {
      logger.error({ content }, 'Failed to parse hook variants JSON')
      throw new Error('OpenAI returned invalid JSON for hook generation')
    }

    if (!Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
      throw new Error('OpenAI returned no hook variants')
    }

    const result = await this.db.hookVariant.createMany({
      data: parsed.hooks.map((hook) => ({
        scriptId: params.scriptId,
        hookText: hook.hookText,
        emotionType: hook.emotionType as any,
        visualSuggestion: hook.visualSuggestion,
        audioSuggestion: hook.audioSuggestion ?? null,
        score: hook.score,
      })),
    })

    logger.info({
      scriptId: params.scriptId,
      count: result.count,
      tokensUsed,
    }, 'Hook variants saved')

    return { count: result.count }
  }
}
