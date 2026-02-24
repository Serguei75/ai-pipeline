import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScriptService } from '../services/script.service.js'
import { ChannelType, ContentFormat, Niche, ScriptStatus } from '../types.js'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDb = {
  script: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  hookVariant: {
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  $transaction: vi.fn(),
}

const mockOpenAI = { complete: vi.fn() }
const mockHookService = { generateHooks: vi.fn() }

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ScriptService', () => {
  let scriptService: ScriptService

  beforeEach(() => {
    vi.clearAllMocks()
    scriptService = new ScriptService(
      mockDb as any,
      mockOpenAI as any,
      mockHookService as any,
    )
  })

  // ── generate() ─────────────────────────────────────────────────────────────

  describe('generate()', () => {
    it('creates script record and generates 5 hook variants', async () => {
      mockDb.script.findUnique.mockResolvedValue(null)
      mockDb.script.create.mockResolvedValue({ id: 'script-1', topicId: 'topic-1' })
      mockHookService.generateHooks.mockResolvedValue({ count: 5 })
      mockDb.script.update.mockResolvedValue({ id: 'script-1', status: ScriptStatus.HOOK_GENERATED })
      mockDb.script.findUniqueOrThrow.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.HOOK_GENERATED,
        hookVariants: [],
      })

      await scriptService.generate({
        topicId: 'topic-1',
        topicTitle: 'How AI is replacing financial advisors in 2026',
        channelType: ChannelType.INTELLECTUAL,
        contentFormat: ContentFormat.DEEP_ESSAY,
        niche: Niche.FINANCE,
        targetMarkets: ['US', 'CA', 'AU'],
        keywords: ['AI', 'finance', '2026'],
      })

      expect(mockDb.script.create).toHaveBeenCalledOnce()
      expect(mockHookService.generateHooks).toHaveBeenCalledOnce()
      expect(mockDb.script.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ScriptStatus.HOOK_GENERATED }),
        })
      )
    })

    it('throws Conflict if script already exists for topicId', async () => {
      mockDb.script.findUnique.mockResolvedValue({ id: 'existing-script' })

      await expect(
        scriptService.generate({
          topicId: 'topic-1',
          topicTitle: 'Test',
          channelType: ChannelType.FUEL,
          contentFormat: ContentFormat.SHORT_FUEL,
          niche: Niche.TECH,
          targetMarkets: ['US'],
          keywords: [],
        })
      ).rejects.toThrow('already exists')

      expect(mockDb.script.create).not.toHaveBeenCalled()
    })
  })

  // ── approveHook() ──────────────────────────────────────────────────────────

  describe('approveHook()', () => {
    it('throws if script is not in HOOK_GENERATED status', async () => {
      mockDb.script.findUniqueOrThrow.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.APPROVED,
      })

      await expect(
        scriptService.approveHook('script-1', { hookVariantId: 'hook-uuid' })
      ).rejects.toThrow('HOOK_GENERATED')
    })

    it('throws if hook does not belong to script', async () => {
      mockDb.script.findUniqueOrThrow.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.HOOK_GENERATED,
      })
      mockDb.hookVariant.findUniqueOrThrow.mockResolvedValue({
        id: 'hook-uuid',
        scriptId: 'other-script-id', // wrong script!
      })

      await expect(
        scriptService.approveHook('script-1', { hookVariantId: 'hook-uuid' })
      ).rejects.toThrow('does not belong')
    })
  })

  // ── submitForReview() ──────────────────────────────────────────────────────

  describe('submitForReview()', () => {
    it('throws if script is not in SCRIPT_GENERATED status', async () => {
      mockDb.script.findUniqueOrThrow.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.HOOK_GENERATED,
      })

      await expect(scriptService.submitForReview('script-1'))
        .rejects.toThrow('SCRIPT_GENERATED')
    })

    it('transitions status to UNDER_REVIEW', async () => {
      mockDb.script.findUniqueOrThrow.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.SCRIPT_GENERATED,
      })
      mockDb.script.update.mockResolvedValue({
        id: 'script-1',
        status: ScriptStatus.UNDER_REVIEW,
      })

      const result = await scriptService.submitForReview('script-1')
      expect(result.status).toBe(ScriptStatus.UNDER_REVIEW)
    })
  })
})
