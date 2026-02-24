import { describe, it, expect } from 'vitest'
import { buildHookUserPrompt, HOOK_SYSTEM_PROMPT } from '../prompts/hook.prompt.js'
import { buildFuelUserPrompt, FUEL_SYSTEM_PROMPT } from '../prompts/fuel.prompt.js'
import { buildDeepUserPrompt, DEEP_SYSTEM_PROMPT } from '../prompts/deep.prompt.js'

describe('Prompts', () => {
  const baseParams = {
    topicTitle: 'How AI is replacing financial advisors in 2026',
    niche: 'FINANCE',
    targetMarkets: ['US', 'AU', 'NO'],
    keywords: ['AI', 'finance', 'advisors'],
    approvedHook: "AI just made 40% of financial advisors obsolete. Overnight.",
    contentFormat: 'DEEP_ESSAY',
  }

  describe('HOOK_SYSTEM_PROMPT', () => {
    it('contains the 8-second research fact', () => {
      expect(HOOK_SYSTEM_PROMPT).toContain('8 SECONDS')
      expect(HOOK_SYSTEM_PROMPT).toContain('55%')
    })

    it('lists all 5 emotion types', () => {
      expect(HOOK_SYSTEM_PROMPT).toContain('CURIOSITY')
      expect(HOOK_SYSTEM_PROMPT).toContain('FEAR')
      expect(HOOK_SYSTEM_PROMPT).toContain('SURPRISE')
      expect(HOOK_SYSTEM_PROMPT).toContain('DESIRE')
      expect(HOOK_SYSTEM_PROMPT).toContain('URGENCY')
    })
  })

  describe('buildHookUserPrompt()', () => {
    it('includes topic title and target markets', () => {
      const prompt = buildHookUserPrompt(baseParams)
      expect(prompt).toContain(baseParams.topicTitle)
      expect(prompt).toContain('US')
      expect(prompt).toContain('AU')
      expect(prompt).toContain('NO')
    })

    it('specifies deep essay format label', () => {
      const prompt = buildHookUserPrompt(baseParams)
      expect(prompt).toContain('8-15 minute')
    })
  })

  describe('FUEL_SYSTEM_PROMPT', () => {
    it('forbids filler phrases', () => {
      expect(FUEL_SYSTEM_PROMPT).toContain('NO filler')
      expect(FUEL_SYSTEM_PROMPT).toContain('In this video')
    })
  })

  describe('buildFuelUserPrompt()', () => {
    it('includes approved hook text', () => {
      const prompt = buildFuelUserPrompt(baseParams)
      expect(prompt).toContain(baseParams.approvedHook)
      expect(prompt).toContain('EXACTLY as written')
    })
  })

  describe('DEEP_SYSTEM_PROMPT', () => {
    it('contains CTV research reference', () => {
      expect(DEEP_SYSTEM_PROMPT).toContain('45%')
      expect(DEEP_SYSTEM_PROMPT).toContain('CTV')
    })

    it('enforces non-negotiable structure', () => {
      expect(DEEP_SYSTEM_PROMPT).toContain('NON-NEGOTIABLE')
      expect(DEEP_SYSTEM_PROMPT).toContain('BLOCK 1')
      expect(DEEP_SYSTEM_PROMPT).toContain('BLOCK 4')
    })
  })

  describe('buildDeepUserPrompt()', () => {
    it('includes all required fields', () => {
      const prompt = buildDeepUserPrompt(baseParams)
      expect(prompt).toContain(baseParams.topicTitle)
      expect(prompt).toContain(baseParams.approvedHook)
      expect(prompt).toContain('commentBait')
      expect(prompt).toContain('localizationNotes')
    })
  })
})
