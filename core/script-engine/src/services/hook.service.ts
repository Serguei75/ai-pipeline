import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import { logger } from '../logger'
import { llmService } from './llm.service'
import { buildHookPrompt, type HookPromptOutput } from '../prompts/hook.prompt'
import { NotFoundError } from '../errors/app.errors'
import type { ChannelType, ContentFormat, Niche, HookEmotion, HookGenerationResult } from '../types'

export interface GenerateHooksInput {
  scriptId: string
  topicTitle: string
  niche: Niche
  channelType: ChannelType
  contentFormat: ContentFormat
  targetMarkets: string[]
  count?: number
}

// Emotion-specific quality baseline (from research: FEAR and URGENCY get highest CTR)
const EMOTION_BASELINE: Record<string, number> = {
  CURIOSITY: 75,
  FEAR:      88,
  SURPRISE:  78,
  DESIRE:    72,
  URGENCY:   85,
}

const blendScore = (llmScore: number, emotion: string): number => {
  const baseline = EMOTION_BASELINE[emotion] ?? 75
  // 60% LLM self-assessment + 40% emotion-weight baseline
  return Math.round(llmScore * 0.6 + baseline * 0.4)
}

export const hookService = {
  async generateForScript(input: GenerateHooksInput): Promise<HookGenerationResult> {
    const { scriptId, count = 5, ...promptInput } = input
    const requestId = uuidv4()
    const log = logger.child({ scriptId, requestId, service: 'hook' })
    log.info({ count }, 'Generating hook variants')

    const prompt = buildHookPrompt({ ...promptInput, count })
    const { parsed } = await llmService.generateJson<HookPromptOutput>({
      prompt,
      maxTokens:   1200,
      temperature: 0.85, // higher creativity for hook variety
      requestId,
    })

    if (!parsed.hooks || parsed.hooks.length === 0) {
      throw new Error('LLM returned no hooks')
    }

    // Save all hooks, calculate blended scores
    const hookRecords = await Promise.all(
      parsed.hooks.map(async (h) => {
        const finalScore = blendScore(h.score ?? 70, h.emotionType)
        return db.hook.create({
          data: {
            scriptId,
            text:             h.text,
            score:            finalScore,
            emotionType:      h.emotionType as HookEmotion,
            visualSuggestion: h.visualSuggestion,
            approved:         false,
          },
        })
      }),
    )

    // Select top hook by blended score
    const sorted  = [...hookRecords].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const topHook = sorted[0]
    if (!topHook) throw new Error('No top hook found after generation')

    log.info({ hookCount: hookRecords.length, topScore: topHook.score }, 'Hooks generated')

    return {
      hooks: hookRecords.map((h) => ({
        text:             h.text,
        emotionType:      h.emotionType as HookEmotion,
        visualSuggestion: h.visualSuggestion ?? '',
        score:            h.score ?? 0,
      })),
      topHook: {
        text:             topHook.text,
        emotionType:      topHook.emotionType as HookEmotion,
        visualSuggestion: topHook.visualSuggestion ?? '',
        score:            topHook.score ?? 0,
      },
    }
  },

  async approveHook(hookId: string): Promise<void> {
    const hook = await db.hook.findUnique({ where: { id: hookId } })
    if (!hook) throw new NotFoundError('Hook', hookId)

    // Atomic: unapprove all, approve selected, update script hookText
    await db.$transaction([
      db.hook.updateMany({
        where: { scriptId: hook.scriptId },
        data:  { approved: false },
      }),
      db.hook.update({
        where: { id: hookId },
        data:  { approved: true },
      }),
      db.script.update({
        where: { id: hook.scriptId },
        data:  { hookText: hook.text, hookScore: hook.score },
      }),
    ])

    logger.info({ hookId, scriptId: hook.scriptId }, 'Hook approved')
  },
}
