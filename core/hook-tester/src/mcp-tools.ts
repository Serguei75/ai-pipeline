/**
 * Hook Tester — MCP Tools
 * Tools exposed to NanoBot:
 *   generate_hook_variants — create 3 hook alternatives for a topic/script
 *   get_hook_test_results  — A/B test results after 48h
 *   get_best_hooks         — top performing hooks as templates
 *   flag_weak_hook         — manually flag a hook as underperforming
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3008}`
const j = (r: Response) => r.json()

export const hookTesterTools: McpTool[] = [
  {
    name: 'generate_hook_variants',
    description:
      'Generate 3 hook variants for a topic using different psychological triggers: ' +
      'Fear/Curiosity/Surprise (FUEL) or Curiosity/Desire/Social Proof (INTELLECTUAL). ' +
      'Returns 3 hooks with predicted retention scores.',
    schema: {
      properties: {
        topic:    { type: 'string', description: 'Video topic or title' },
        scriptId: { type: 'string', description: 'Existing script ID (optional, improves quality)' },
        channel:  { type: 'string', description: 'Target channel type', enum: ['FUEL', 'INTELLECTUAL'] }
      },
      required: ['topic']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/hooks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }))
  },
  {
    name: 'get_hook_test_results',
    description:
      'Get A/B test results for hook variants after 48 hours. ' +
      'Returns winner, retention_8s % for each variant, and confidence score.',
    schema: {
      properties: {
        testId: { type: 'string', description: 'Hook test ID' }
      },
      required: ['testId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/hooks/tests/${args.testId}`))
  },
  {
    name: 'get_best_hooks',
    description:
      'Get the top performing hooks from the template library. ' +
      'Use these as reference when generating new scripts.',
    schema: {
      properties: {
        niche:   { type: 'string', description: 'Filter by niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        channel: { type: 'string', description: 'Filter by channel', enum: ['FUEL', 'INTELLECTUAL'] },
        limit:   { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams({ sort: 'retentionScore', order: 'desc' })
      if (args.niche)   p.set('niche', String(args.niche))
      if (args.channel) p.set('channel', String(args.channel))
      if (args.limit)   p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/hooks/templates?${p}`))
    }
  },
  {
    name: 'flag_weak_hook',
    description: 'Manually flag a hook as underperforming to exclude it from templates.',
    schema: {
      properties: {
        hookId: { type: 'string', description: 'Hook ID to flag' },
        reason: { type: 'string', description: 'Reason for flagging' }
      },
      required: ['hookId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/hooks/${args.hookId}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: args.reason })
      }))
  }
]
