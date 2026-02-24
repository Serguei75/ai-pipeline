import type { PrismaClient } from '@prisma/client'
import type { OpenAIService } from './openai.service.js'
import type { HookService } from './hook.service.js'
import { buildFuelUserPrompt, FUEL_SYSTEM_PROMPT } from '../prompts/fuel.prompt.js'
import { buildDeepUserPrompt, DEEP_SYSTEM_PROMPT } from '../prompts/deep.prompt.js'
import {
  ContentFormat,
  ScriptStatus,
  type ApproveHookDTO,
  type ApproveScriptDTO,
  type GenerateScriptDTO,
  type RejectScriptDTO,
  type ScriptFilters,
  type UpdateScriptDTO,
} from '../types.js'
import { logger } from '../logger.js'

export class ScriptService {
  constructor(
    private readonly db: PrismaClient,
    private readonly openai: OpenAIService,
    private readonly hookService: HookService,
  ) {}

  // ─── Generate: create record + generate 5 hook variants ─────────────────────

  async generate(dto: GenerateScriptDTO) {
    const existing = await this.db.script.findUnique({ where: { topicId: dto.topicId } })
    if (existing) {
      throw new Error(`Script for topic ${dto.topicId} already exists (id: ${existing.id})`)
    }

    const script = await this.db.script.create({
      data: {
        topicId: dto.topicId,
        topicTitle: dto.topicTitle,
        channelType: dto.channelType,
        contentFormat: dto.contentFormat,
        niche: dto.niche,
        targetMarkets: dto.targetMarkets,
        keywords: dto.keywords ?? [],
        languages: dto.languages ?? ['en'],
        description: dto.description,
        status: ScriptStatus.PENDING,
      },
    })

    logger.info({ scriptId: script.id, topicId: dto.topicId }, 'Script created, starting hook generation')

    // Generate 5 hook variants (0-8 sec — critical decision window)
    await this.hookService.generateHooks({
      scriptId: script.id,
      topicTitle: dto.topicTitle,
      niche: dto.niche,
      targetMarkets: dto.targetMarkets,
      keywords: dto.keywords ?? [],
      contentFormat: dto.contentFormat,
    })

    // Update status to HOOK_GENERATED — awaits human selection
    await this.db.script.update({
      where: { id: script.id },
      data: { status: ScriptStatus.HOOK_GENERATED, generatedAt: new Date() },
    })

    return this.findById(script.id)
  }

  // ─── Approve hook: triggers full script generation ───────────────────────────

  async approveHook(scriptId: string, dto: ApproveHookDTO) {
    const script = await this.db.script.findUniqueOrThrow({ where: { id: scriptId } })

    if (script.status !== ScriptStatus.HOOK_GENERATED) {
      throw new Error(`Cannot approve hook: script is in status "${script.status}", expected HOOK_GENERATED`)
    }

    const hook = await this.db.hookVariant.findUniqueOrThrow({ where: { id: dto.hookVariantId } })

    if (hook.scriptId !== scriptId) {
      throw new Error(`Hook ${dto.hookVariantId} does not belong to script ${scriptId}`)
    }

    // Atomic: clear all approvals, approve selected, update script status
    await this.db.$transaction([
      this.db.hookVariant.updateMany({
        where: { scriptId },
        data: { approved: false },
      }),
      this.db.hookVariant.update({
        where: { id: dto.hookVariantId },
        data: { approved: true },
      }),
      this.db.script.update({
        where: { id: scriptId },
        data: {
          approvedHookId: dto.hookVariantId,
          status: ScriptStatus.HOOK_APPROVED,
        },
      }),
    ])

    logger.info({ scriptId, hookVariantId: dto.hookVariantId }, 'Hook approved, generating full script')

    return this.generateFullScript(scriptId)
  }

  // ─── Generate full script (internal, called after hook approval) ─────────────

  private async generateFullScript(scriptId: string) {
    const script = await this.db.script.findUniqueOrThrow({
      where: { id: scriptId },
      include: { hookVariants: { where: { approved: true } } },
    })

    const approvedHook = script.hookVariants[0]
    if (!approvedHook) {
      throw new Error(`No approved hook found for script ${scriptId}`)
    }

    const baseParams = {
      topicTitle: script.topicTitle,
      approvedHook: approvedHook.hookText,
      niche: script.niche,
      keywords: script.keywords,
      targetMarkets: script.targetMarkets,
      description: script.description ?? undefined,
      languages: script.languages,
    }

    if (script.contentFormat === ContentFormat.SHORT_FUEL) {
      const { content, tokensUsed, model } = await this.openai.complete(
        FUEL_SYSTEM_PROMPT,
        buildFuelUserPrompt(baseParams),
      )

      let parsed: {
        script: string
        segments: unknown[]
        estimatedDuration: number
        thumbnailIdeas: string[]
        titleVariants: string[]
      }
      try {
        parsed = JSON.parse(content)
      } catch {
        throw new Error('OpenAI returned invalid JSON for FUEL script')
      }

      return this.db.script.update({
        where: { id: scriptId },
        data: {
          scriptFuel: parsed.script,
          segments: parsed.segments as any,
          thumbnailIdeas: parsed.thumbnailIdeas ?? [],
          titleVariants: parsed.titleVariants ?? [],
          llmTokensUsed: tokensUsed,
          llmModel: model,
          status: ScriptStatus.SCRIPT_GENERATED,
          generatedAt: new Date(),
        },
        include: { hookVariants: true },
      })
    }

    // DEEP_ESSAY
    const { content, tokensUsed, model } = await this.openai.complete(
      DEEP_SYSTEM_PROMPT,
      buildDeepUserPrompt(baseParams),
    )

    let parsed: {
      script: string
      segments: unknown[]
      commentBait: string[]
      thumbnailIdeas: string[]
      titleVariants: string[]
      estimatedDuration: number
      localizationNotes?: string
    }
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('OpenAI returned invalid JSON for DEEP_ESSAY script')
    }

    return this.db.script.update({
      where: { id: scriptId },
      data: {
        scriptDeep: parsed.script,
        segments: parsed.segments as any,
        commentBait: parsed.commentBait ?? [],
        thumbnailIdeas: parsed.thumbnailIdeas ?? [],
        titleVariants: parsed.titleVariants ?? [],
        localizationNotes: parsed.localizationNotes,
        llmTokensUsed: tokensUsed,
        llmModel: model,
        status: ScriptStatus.SCRIPT_GENERATED,
        generatedAt: new Date(),
      },
      include: { hookVariants: true },
    })
  }

  // ─── Status transitions ───────────────────────────────────────────────────────

  async submitForReview(scriptId: string) {
    const script = await this.db.script.findUniqueOrThrow({ where: { id: scriptId } })
    if (script.status !== ScriptStatus.SCRIPT_GENERATED) {
      throw new Error(`Cannot submit for review: expected SCRIPT_GENERATED, got "${script.status}"`)
    }
    return this.db.script.update({
      where: { id: scriptId },
      data: { status: ScriptStatus.UNDER_REVIEW },
    })
  }

  async approve(scriptId: string, dto: ApproveScriptDTO) {
    return this.db.script.update({
      where: { id: scriptId },
      data: {
        status: ScriptStatus.APPROVED,
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
    })
  }

  async reject(scriptId: string, dto: RejectScriptDTO) {
    return this.db.script.update({
      where: { id: scriptId },
      data: {
        status: ScriptStatus.REJECTED,
        reviewNotes: dto.reviewNotes,
        reviewedBy: dto.reviewedBy,
        reviewedAt: new Date(),
      },
    })
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async update(scriptId: string, dto: UpdateScriptDTO) {
    return this.db.script.update({
      where: { id: scriptId },
      data: dto,
    })
  }

  async findAll(filters: ScriptFilters) {
    return this.db.script.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.channelType && { channelType: filters.channelType }),
        ...(filters.niche && { niche: filters.niche }),
      },
      include: { hookVariants: { orderBy: { score: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      skip: filters.offset ?? 0,
      take: filters.limit ?? 50,
    })
  }

  async findById(id: string) {
    return this.db.script.findUniqueOrThrow({
      where: { id },
      include: { hookVariants: { orderBy: { score: 'desc' } } },
    })
  }

  async delete(id: string) {
    return this.db.script.delete({ where: { id } })
  }
}
