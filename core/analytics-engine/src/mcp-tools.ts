/**
 * Analytics Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   get_channel_stats      — overall channel KPIs
 *   get_weak_hooks         — videos with poor early retention
 *   get_niche_performance  — RPM/views by niche
 *   get_top_videos         — best performing videos
 *   generate_weekly_report — full weekly analytics summary
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3005}`
const j = (r: Response) => r.json()

export const analyticsEngineTools: McpTool[] = [
  {
    name: 'get_channel_stats',
    description:
      'Get overall channel performance statistics: views, watch time, RPM, CTR, ' +
      'subscriber count and growth for a given period.',
    schema: {
      properties: {
        period:    { type: 'string', description: 'Time period', enum: ['7d', '28d', '90d', '365d'], default: '28d' },
        channelId: { type: 'string', description: 'YouTube channel ID (optional, uses default if omitted)' }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.period)    p.set('period', String(args.period))
      if (args.channelId) p.set('channelId', String(args.channelId))
      return j(await fetch(`${BASE}/analytics/channel?${p}`))
    }
  },
  {
    name: 'get_weak_hooks',
    description:
      'Get videos with poor early retention (0-8s). These need new hooks via Hook Tester. ' +
      'Returns video ID, title, retention_8s %, and current hook text.',
    schema: {
      properties: {
        threshold: { type: 'number', description: 'retention_8s threshold % (default 40)', default: 40 },
        limit:     { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.threshold) p.set('retentionThreshold', String(args.threshold))
      if (args.limit)     p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/analytics/weak-hooks?${p}`))
    }
  },
  {
    name: 'get_niche_performance',
    description:
      'Get performance breakdown by content niche (AI, FINANCE, HEALTH, TECH). ' +
      'Shows avg RPM, avg views, total revenue estimate per niche.',
    schema: {
      properties: {
        period: { type: 'string', description: 'Time period', enum: ['7d', '28d', '90d'], default: '28d' }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.period) p.set('period', String(args.period))
      return j(await fetch(`${BASE}/analytics/niches?${p}`))
    }
  },
  {
    name: 'get_top_videos',
    description: 'Get top performing videos by views, RPM or watch time.',
    schema: {
      properties: {
        metric: { type: 'string', description: 'Sort metric', enum: ['views', 'rpm', 'watchTime', 'ctr'], default: 'views' },
        period: { type: 'string', description: 'Time period', enum: ['7d', '28d', '90d'], default: '28d' },
        limit:  { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.metric) p.set('sort', String(args.metric))
      if (args.period) p.set('period', String(args.period))
      if (args.limit)  p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/analytics/top-videos?${p}`))
    }
  },
  {
    name: 'generate_weekly_report',
    description:
      'Generate a comprehensive weekly analytics report with KPIs, best/worst content, ' +
      'niche breakdown, and actionable recommendations. Send this to Telegram every Monday.',
    schema: { properties: {} },
    handler: async () =>
      j(await fetch(`${BASE}/analytics/weekly-report`, { method: 'POST' }))
  }
]
