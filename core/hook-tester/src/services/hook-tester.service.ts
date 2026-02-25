import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import {
  CreateTestDto,
  UpdatePerformanceDto,
  TRIGGER_INSTRUCTIONS,
  DEFAULT_TRIGGERS,
  computeScore,
  HookTrigger,
  ChannelType,
} from '../types'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MIN_VIEWS = parseInt(process.env.MIN_VIEWS_TO_CONCLUDE || '500', 10)

export class HookTesterService {
  // ── CREATE TEST + GENERATE VARIANTS ──────────────────────────────
  async createTest(dto: CreateTestDto) {
    const triggers = dto.triggersOverride ?? DEFAULT_TRIGGERS[dto.channelType]

    const test = await prisma.hookTest.create({
      data: {
        scriptId: dto.scriptId,
        topicTitle: dto.topicTitle,
        channelType: dto.channelType,
        niche: dto.niche ?? 'general',
        status: 'GENERATING',
      },
    })

    // Generate all variants in parallel
    const variantPromises = triggers.map((trigger) =>
      this.generateVariant(test.id, dto.topicTitle, trigger, dto.channelType),
    )
    await Promise.all(variantPromises)

    return prisma.hookTest.update({
      where: { id: test.id },
      data: { status: 'RUNNING' },
      include: { variants: true },
    })
  }

  private async generateVariant(
    testId: string,
    topicTitle: string,
    trigger: HookTrigger,
    channelType: ChannelType,
  ): Promise<void> {
    const format = channelType === 'FUEL'
      ? 'YouTube Shorts (0–8 second hook)'
      : 'YouTube video essay (0–30 second hook)'
    const maxWords = channelType === 'FUEL' ? '15–25 words' : '35–60 words'

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an elite YouTube hook writer for ${format}.
${TRIGGER_INSTRUCTIONS[trigger]}
Length: ${maxWords}. Be specific and visceral. Use numbers when possible.
Return ONLY the hook text. No quotes, no labels, no explanation.`,
        },
        { role: 'user', content: `Topic: "${topicTitle}"` },
      ],
      temperature: 0.85,
      max_tokens: 120,
    })

    const hookText = response.choices[0].message.content?.trim() ?? ''
    await prisma.hookVariant.create({
      data: { testId, trigger, hookText },
    })
  }

  // ── UPDATE PERFORMANCE DATA (from Analytics Engine) ────────────────
  async updateVariantPerformance(
    testId: string,
    variantId: string,
    data: UpdatePerformanceDto,
  ) {
    const score = computeScore(data)

    const variant = await prisma.hookVariant.update({
      where: { id: variantId },
      data: { ...data, performanceScore: score },
    })

    // Check if test can be concluded
    const test = await prisma.hookTest.findUniqueOrThrow({
      where: { id: testId },
      include: { variants: true },
    })

    const allHaveData = test.variants.every(
      (v) => v.viewCount !== null && (v.viewCount ?? 0) >= MIN_VIEWS,
    )
    if (allHaveData) {
      await this.concludeTest(testId)
    }

    return variant
  }

  // ── CONCLUDE — determine winner + promote to templates ──────────────
  async concludeTest(testId: string) {
    const test = await prisma.hookTest.findUniqueOrThrow({
      where: { id: testId },
      include: { variants: true },
    })

    if (test.status === 'CONCLUDED') return test

    // Find winner: highest performanceScore with sufficient data
    const eligible = test.variants
      .filter((v) => (v.performanceScore ?? 0) > 0)
      .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))

    const winner = eligible[0]
    if (!winner) return test

    // Mark winner
    await prisma.hookVariant.update({
      where: { id: winner.id },
      data: { isWinner: true },
    })

    await prisma.hookTest.update({
      where: { id: testId },
      data: {
        status: 'CONCLUDED',
        winnerId: winner.id,
        concludedAt: new Date(),
      },
    })

    // Promote to template library if score is strong
    if ((winner.retention8s ?? 0) >= (parseInt(process.env.MIN_RETENTION_THRESHOLD || '40'))) {
      await this.promoteToTemplates(winner, test)
    }

    return prisma.hookTest.findUniqueOrThrow({
      where: { id: testId },
      include: { variants: { orderBy: { performanceScore: 'desc' } } },
    })
  }

  private async promoteToTemplates(
    winner: { id: string; trigger: HookTrigger; hookText: string; retention8s: number | null; performanceScore: number | null },
    test: { channelType: ChannelType; niche: string; id: string },
  ): Promise<void> {
    await prisma.hookTemplate.upsert({
      where: {
        // Use unique combo as upsert key (simplified)
        id: `${test.channelType}_${winner.trigger}_${test.niche}`,
      },
      update: {
        hookText: winner.hookText,
        retention8s: winner.retention8s ?? 0,
        performanceScore: winner.performanceScore ?? 0,
        timesUsed: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        id: `${test.channelType}_${winner.trigger}_${test.niche}`,
        trigger: winner.trigger,
        channelType: test.channelType,
        niche: test.niche,
        hookText: winner.hookText,
        sourceTestId: test.id,
        retention8s: winner.retention8s ?? 0,
        performanceScore: winner.performanceScore ?? 0,
      },
    })
  }

  // ── QUERIES ────────────────────────────────────────────────────
  async listTests(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where = status ? { status: status as 'RUNNING' } : {}
    const [tests, total] = await Promise.all([
      prisma.hookTest.findMany({
        where,
        skip,
        take: limit,
        include: { variants: { orderBy: { performanceScore: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hookTest.count({ where }),
    ])
    return { tests, total, page, limit }
  }

  async getTest(id: string) {
    return prisma.hookTest.findUniqueOrThrow({
      where: { id },
      include: { variants: { orderBy: { performanceScore: 'desc' } } },
    })
  }

  // Template library — best hooks per trigger/channel/niche
  async getTemplates(channelType?: ChannelType, niche?: string) {
    return prisma.hookTemplate.findMany({
      where: {
        isActive: true,
        ...(channelType ? { channelType } : {}),
        ...(niche ? { niche } : {}),
      },
      orderBy: { performanceScore: 'desc' },
      take: 50,
    })
  }

  async getStats() {
    const [total, concluded, running, totalVariants, avgRetention] = await Promise.all([
      prisma.hookTest.count(),
      prisma.hookTest.count({ where: { status: 'CONCLUDED' } }),
      prisma.hookTest.count({ where: { status: 'RUNNING' } }),
      prisma.hookVariant.count(),
      prisma.hookVariant.aggregate({
        _avg: { retention8s: true, performanceScore: true },
        where: { retention8s: { not: null } },
      }),
    ])
    return {
      total,
      concluded,
      running,
      totalVariants,
      avgRetention8s: avgRetention._avg.retention8s,
      avgScore: avgRetention._avg.performanceScore,
    }
  }
}
