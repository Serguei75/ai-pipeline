import { v4 as uuidv4 } from 'uuid'
import type { Prisma } from '@prisma/client'
import { db } from '../db'
import { logger } from '../logger'
import { llmService } from './llm.service'
import { hookService } from './hook.service'
import { buildFuelPrompt } from '../prompts/fuel.prompt'
import { buildDeepPrompt } from '../prompts/deep.prompt'
import { VERSION as FUEL_VERSION } from '../prompts/fuel.prompt'
import { VERSION as DEEP_VERSION } from '../prompts/deep.prompt'
import {
  NotFoundError,
  ValidationError,
  InvalidStatusTransitionError,
} from '../errors/app.errors'
import {
  ChannelType,
  ContentFormat,
  ScriptStatus,
  type CreateScriptDTO,
  type UpdateScriptDTO,
  type ApproveScriptDTO,
  type RegenerateScriptDTO,
  type ScriptFilters,
  type GeneratedScript,
} from '../types'

// State machine: defines which transitions are valid
const VALID_TRANSITIONS: Record<ScriptStatus, ScriptStatus[]> = {
  [ScriptStatus.GENERATING]: [ScriptStatus.DRAFT, ScriptStatus.REJECTED],
  [ScriptStatus.DRAFT]:      [ScriptStatus.REVIEW, ScriptStatus.ARCHIVED],
  [ScriptStatus.REVIEW]:     [ScriptStatus.APPROVED, ScriptStatus.REJECTED],
  [ScriptStatus.APPROVED]:   [ScriptStatus.ARCHIVED],
  [ScriptStatus.REJECTED]:   [ScriptStatus.GENERATING],
  [ScriptStatus.ARCHIVED]:   [],
}

const assertValidTransition = (from: ScriptStatus, to: ScriptStatus): void => {
  const allowed = VALID_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new InvalidStatusTransitionError(from, to)
  }
}

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length

const buildPrompt = (dto: { topicTitle: string; hookText: string; niche: string; targetMarkets: string[]; context?: string }, format: ContentFormat): string =>
  format === ContentFormat.SHORT_FUEL
    ? buildFuelPrompt({ topicTitle: dto.topicTitle, hookText: dto.hookText, niche: dto.niche as import('../types').Niche, targetMarkets: dto.targetMarkets, keywords: [], context: dto.context })
    : buildDeepPrompt({ topicTitle: dto.topicTitle, hookText: dto.hookText, niche: dto.niche as import('../types').Niche, targetMarkets: dto.targetMarkets, keywords: [], context: dto.context })

export const scriptService = {
  async create(dto: CreateScriptDTO): Promise<{ id: string }> {
    const requestId = uuidv4()
    const log = logger.child({ requestId, service: 'script' })
    log.info({ topicId: dto.topicId, channelType: dto.channelType, contentFormat: dto.contentFormat }, 'Creating script')

    // Step 1: Create record in GENERATING state
    const script = await db.script.create({
      data: {
        topicId:       dto.topicId,
        topicTitle:    dto.topicTitle,
        channelType:   dto.channelType,
        contentFormat: dto.contentFormat,
        niche:         dto.niche,
        targetMarkets: dto.targetMarkets,
        languages:     dto.languages ?? ['en'],
        status:        ScriptStatus.GENERATING,
      },
    })

    try {
      // Step 2: Generate 5 hook variants
      const hookResult = await hookService.generateForScript({
        scriptId:      script.id,
        topicTitle:    dto.topicTitle,
        niche:         dto.niche,
        channelType:   dto.channelType,
        contentFormat: dto.contentFormat,
        targetMarkets: dto.targetMarkets,
        count:         5,
      })

      // Step 3: Auto-approve the top-scoring hook for the initial draft
      const topHookDb = await db.hook.findFirst({
        where:   { scriptId: script.id },
        orderBy: { score: 'desc' },
      })
      if (topHookDb) await hookService.approveHook(topHookDb.id)

      // Step 4: Generate full script using the top hook
      const promptVersion = dto.contentFormat === ContentFormat.SHORT_FUEL ? FUEL_VERSION : DEEP_VERSION
      const maxTokens     = dto.contentFormat === ContentFormat.SHORT_FUEL ? 1500 : 6000

      const { parsed, meta } = await llmService.generateJson<GeneratedScript>({
        prompt:      buildPrompt({ topicTitle: dto.topicTitle, hookText: hookResult.topHook.text, niche: dto.niche, targetMarkets: dto.targetMarkets, context: dto.context }, dto.contentFormat),
        maxTokens,
        temperature: 0.65,
        requestId,
      })

      const wordCount = countWords(parsed.script)

      // Step 5: Save script + revision v1 atomically
      await db.$transaction([
        db.script.update({
          where: { id: script.id },
          data: {
            hookText:          hookResult.topHook.text,
            hookScore:         hookResult.topHook.score,
            script:            parsed.script,
            scriptBlocks:      parsed.scriptBlocks as unknown as Prisma.InputJsonValue,
            estimatedDuration: parsed.estimatedDuration,
            wordCount,
            llmModel:          meta.model,
            promptVersion,
            status:            ScriptStatus.DRAFT,
          },
        }),
        db.scriptRevision.create({
          data: {
            scriptId:  script.id,
            version:   1,
            content:   parsed.scriptBlocks as unknown as Prisma.InputJsonValue,
            changes:   'Initial generation',
            createdBy: 'AI',
          },
        }),
      ])

      log.info({ scriptId: script.id, wordCount, model: meta.model }, 'Script created successfully')
    } catch (error) {
      await db.script.update({
        where: { id: script.id },
        data: {
          status:        ScriptStatus.REJECTED,
          rejectionNote: `Generation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        },
      })
      log.error({ scriptId: script.id, error }, 'Script generation failed')
      throw error
    }

    return { id: script.id }
  },

  async findById(id: string) {
    const script = await db.script.findUnique({
      where:   { id },
      include: {
        hooks:     { orderBy: { score: 'desc' } },
        revisions: { orderBy: { version: 'desc' }, take: 10 },
      },
    })
    if (!script) throw new NotFoundError('Script', id)
    return script
  },

  async findMany(filters: ScriptFilters) {
    const { page = 1, perPage = 20, ...where } = filters
    const [data, total] = await db.$transaction([
      db.script.findMany({
        where: {
          ...(where.status        && { status:        where.status }),
          ...(where.channelType   && { channelType:   where.channelType }),
          ...(where.contentFormat && { contentFormat: where.contentFormat }),
          ...(where.niche         && { niche:         where.niche }),
          ...(where.topicId       && { topicId:       where.topicId }),
        },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * perPage,
        take:    perPage,
        include: { hooks: { where: { approved: true }, take: 1 } },
      }),
      db.script.count({
        where: {
          ...(where.status      && { status:      where.status }),
          ...(where.channelType && { channelType: where.channelType }),
          ...(where.niche       && { niche:       where.niche }),
        },
      }),
    ])
    return { data, total, page, perPage, hasMore: page * perPage < total }
  },

  async update(id: string, dto: UpdateScriptDTO) {
    const existing = await db.script.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Script', id)
    if (dto.status) assertValidTransition(existing.status as ScriptStatus, dto.status)

    return db.script.update({
      where: { id },
      data: {
        ...(dto.hookText     !== undefined && { hookText:     dto.hookText }),
        ...(dto.script       !== undefined && { script:       dto.script, wordCount: countWords(dto.script) }),
        ...(dto.scriptBlocks !== undefined && { scriptBlocks: dto.scriptBlocks as unknown as Prisma.InputJsonValue }),
        ...(dto.status                     && { status:       dto.status }),
        ...(dto.rejectionNote              && { rejectionNote: dto.rejectionNote }),
      },
    })
  },

  async approve(id: string, dto: ApproveScriptDTO) {
    const script = await db.script.findUnique({ where: { id } })
    if (!script) throw new NotFoundError('Script', id)
    if (script.status !== ScriptStatus.REVIEW) {
      throw new ValidationError('Script must be in REVIEW status to approve')
    }
    assertValidTransition(script.status as ScriptStatus, ScriptStatus.APPROVED)
    await hookService.approveHook(dto.approvedHookId)
    return db.script.update({
      where: { id },
      data:  { status: ScriptStatus.APPROVED, approvedAt: new Date(), approvedBy: dto.approvedBy },
    })
  },

  async regenerate(id: string, dto: RegenerateScriptDTO) {
    const script = await db.script.findUnique({
      where:   { id },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    })
    if (!script) throw new NotFoundError('Script', id)

    const allowedForRegen: ScriptStatus[] = [ScriptStatus.DRAFT, ScriptStatus.REJECTED]
    if (!allowedForRegen.includes(script.status as ScriptStatus)) {
      throw new ValidationError('Only DRAFT or REJECTED scripts can be regenerated')
    }

    const requestId = uuidv4()
    const log = logger.child({ requestId, scriptId: id, service: 'script' })
    await db.script.update({ where: { id }, data: { status: ScriptStatus.GENERATING } })

    let hookText = script.hookText ?? ''

    if (!dto.keepHook) {
      const hookResult = await hookService.generateForScript({
        scriptId:      id,
        topicTitle:    script.topicTitle,
        niche:         script.niche as import('../types').Niche,
        channelType:   script.channelType as ChannelType,
        contentFormat: script.contentFormat as ContentFormat,
        targetMarkets: script.targetMarkets,
        count:         5,
      })
      hookText = hookResult.topHook.text
    }

    const feedbackCtx   = dto.feedback ? `\n\nPREVIOUS VERSION FEEDBACK TO ADDRESS: ${dto.feedback}` : ''
    const maxTokens     = script.contentFormat === ContentFormat.SHORT_FUEL ? 1500 : 6000
    const promptVersion = script.contentFormat === ContentFormat.SHORT_FUEL ? FUEL_VERSION : DEEP_VERSION
    const nextVersion   = (script.revisions[0]?.version ?? 0) + 1

    const { parsed, meta } = await llmService.generateJson<GeneratedScript>({
      prompt:      buildPrompt({ topicTitle: script.topicTitle, hookText, niche: script.niche, targetMarkets: script.targetMarkets, context: feedbackCtx || undefined }, script.contentFormat as ContentFormat),
      maxTokens,
      temperature: 0.7,
      requestId,
    })

    const wordCount = countWords(parsed.script)

    await db.$transaction([
      db.script.update({
        where: { id },
        data: {
          hookText,
          script:            parsed.script,
          scriptBlocks:      parsed.scriptBlocks as unknown as Prisma.InputJsonValue,
          estimatedDuration: parsed.estimatedDuration,
          wordCount,
          llmModel:          meta.model,
          promptVersion,
          status:            ScriptStatus.DRAFT,
          rejectionNote:     null,
        },
      }),
      db.scriptRevision.create({
        data: {
          scriptId:  id,
          version:   nextVersion,
          content:   parsed.scriptBlocks as unknown as Prisma.InputJsonValue,
          changes:   dto.feedback ?? 'Regenerated without feedback',
          createdBy: 'AI',
        },
      }),
    ])

    log.info({ scriptId: id, version: nextVersion, wordCount }, 'Script regenerated')
    return scriptService.findById(id)
  },

  async delete(id: string): Promise<void> {
    const script = await db.script.findUnique({ where: { id } })
    if (!script) throw new NotFoundError('Script', id)
    if (script.status === ScriptStatus.APPROVED) {
      throw new ValidationError('Cannot delete an approved script — archive it instead')
    }
    await db.script.delete({ where: { id } })
    logger.info({ scriptId: id }, 'Script deleted')
  },
}
