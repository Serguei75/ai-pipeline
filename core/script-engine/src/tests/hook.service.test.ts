import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HookService } from '../services/hook.service.js'

const mockDb = {
  hookVariant: {
    createMany: vi.fn(),
  },
}

const mockOpenAI = {
  complete: vi.fn(),
}

const MOCK_HOOKS = [
  { hookText: 'This single mistake costs investors $50K every year.', emotionType: 'FEAR', visualSuggestion: 'Close-up worried face', audioSuggestion: 'Tense dramatic sting', score: 92 },
  { hookText: 'Nobody tells you what AI is actually doing to your savings right now.', emotionType: 'CURIOSITY', visualSuggestion: 'Question mark animation over AI brain', audioSuggestion: 'Mysterious ambient', score: 88 },
  { hookText: "I turned $5K into $50K in 6 months — here's the exact system.", emotionType: 'DESIRE', visualSuggestion: 'Screen showing portfolio growth', audioSuggestion: 'Upbeat motivational', score: 85 },
  { hookText: 'AI just made 40% of financial advisors obsolete. Overnight.', emotionType: 'SURPRISE', visualSuggestion: 'Breaking news ticker overlay', audioSuggestion: 'News alert sound', score: 90 },
  { hookText: "This opportunity disappears in 2026. Don't wait.", emotionType: 'URGENCY', visualSuggestion: 'Countdown clock animation', audioSuggestion: 'Ticking clock', score: 87 },
]

describe('HookService', () => {
  let hookService: HookService

  beforeEach(() => {
    vi.clearAllMocks()
    hookService = new HookService(mockDb as any, mockOpenAI as any)
  })

  it('generates hooks and saves all 5 variants to DB', async () => {
    mockOpenAI.complete.mockResolvedValue({
      content: JSON.stringify({ hooks: MOCK_HOOKS }),
      tokensUsed: 450,
      model: 'gpt-4o',
    })
    mockDb.hookVariant.createMany.mockResolvedValue({ count: 5 })

    const result = await hookService.generateHooks({
      scriptId: 'script-uuid-1',
      topicTitle: 'How AI is replacing financial advisors in 2026',
      niche: 'FINANCE',
      targetMarkets: ['US', 'CA', 'AU'],
      keywords: ['AI', 'finance', 'advisors', '2026'],
      contentFormat: 'DEEP_ESSAY',
    })

    expect(result.count).toBe(5)
    expect(mockOpenAI.complete).toHaveBeenCalledOnce()
    expect(mockDb.hookVariant.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ scriptId: 'script-uuid-1', emotionType: 'FEAR', score: 92 }),
        expect.objectContaining({ emotionType: 'CURIOSITY' }),
        expect.objectContaining({ emotionType: 'DESIRE' }),
        expect.objectContaining({ emotionType: 'SURPRISE' }),
        expect.objectContaining({ emotionType: 'URGENCY' }),
      ]),
    })
  })

  it('throws a descriptive error if OpenAI returns invalid JSON', async () => {
    mockOpenAI.complete.mockResolvedValue({
      content: 'this is not json at all',
      tokensUsed: 10,
      model: 'gpt-4o',
    })

    await expect(
      hookService.generateHooks({
        scriptId: 'script-uuid-2',
        topicTitle: 'Test topic',
        niche: 'TECH',
        targetMarkets: ['US'],
        keywords: [],
        contentFormat: 'SHORT_FUEL',
      })
    ).rejects.toThrow('invalid JSON')
  })

  it('throws if hooks array is empty in LLM response', async () => {
    mockOpenAI.complete.mockResolvedValue({
      content: JSON.stringify({ hooks: [] }),
      tokensUsed: 20,
      model: 'gpt-4o',
    })

    await expect(
      hookService.generateHooks({
        scriptId: 'script-uuid-3',
        topicTitle: 'Test',
        niche: 'TECH',
        targetMarkets: ['US'],
        keywords: [],
        contentFormat: 'SHORT_FUEL',
      })
    ).rejects.toThrow('no hook variants')
  })
})
