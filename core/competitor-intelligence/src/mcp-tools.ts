/**
 * Competitor Intelligence — MCP Tools
 * Tools exposed to NanoBot:
 *   scan_competitor       — deep scan a competitor channel
 *   get_trending_formats  — trending video formats in a niche
 *   get_top_competitors   — ranked list of top competitors by niche
 *   get_gap_analysis      — topics competitors cover that we don't
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3009}`
const j = (r: Response) => r.json()

export const competitorIntelligenceTools: McpTool[] = [
  {
    name: 'scan_competitor',
    description:
      'Scan a competitor YouTube channel to extract their top videos, ' +
      'hook patterns, posting frequency, and estimated revenue.',
    schema: {
      properties: {
        channelId:  { type: 'string', description: 'YouTube channel ID or handle (@channelname)' },
        videosBack: { type: 'number', description: 'How many recent videos to analyze (default 20)', default: 20 }
      },
      required: ['channelId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/competitors/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }))
  },
  {
    name: 'get_trending_formats',
    description:
      'Get trending video formats and structures in a niche based on competitor analysis. ' +
      'Returns format name, avg views, avg retention, example titles.',
    schema: {
      properties: {
        niche:  { type: 'string', description: 'Content niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        period: { type: 'string', description: 'Analysis period', enum: ['7d', '30d', '90d'], default: '30d' }
      },
      required: ['niche']
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      p.set('niche', String(args.niche))
      if (args.period) p.set('period', String(args.period))
      return j(await fetch(`${BASE}/trends/formats?${p}`))
    }
  },
  {
    name: 'get_top_competitors',
    description: 'Get ranked list of top competitor channels in a niche with subscriber count and upload frequency.',
    schema: {
      properties: {
        niche: { type: 'string', description: 'Content niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        limit: { type: 'number', description: 'Max results (default 10)', default: 10 }
      },
      required: ['niche']
    },
    handler: async (args) => {
      const p = new URLSearchParams({ sort: 'subscribers', order: 'desc' })
      p.set('niche', String(args.niche))
      if (args.limit) p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/competitors?${p}`))
    }
  },
  {
    name: 'get_gap_analysis',
    description:
      'Find topics that top competitors are covering successfully but we have NOT produced yet. ' +
      'These are high-value opportunities. Returns topic ideas with competitor performance data.',
    schema: {
      properties: {
        niche: { type: 'string', description: 'Content niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        limit: { type: 'number', description: 'Max gap topics to return (default 10)', default: 10 }
      },
      required: ['niche']
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      p.set('niche', String(args.niche))
      if (args.limit) p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/competitors/gap-analysis?${p}`))
    }
  }
]
