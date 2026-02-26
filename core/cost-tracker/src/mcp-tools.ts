/**
 * Cost Tracker — MCP Tools
 * Tools exposed to NanoBot:
 *   get_daily_costs     — today's API spend breakdown
 *   get_video_roi       — cost vs revenue for a specific video
 *   get_monthly_summary — monthly cost/revenue/profit summary
 *   get_budget_alerts   — services approaching budget limits
 */

import type { McpTool } from '../../shared/mcp/src/index.js'

const BASE = `http://localhost:${process.env.PORT ?? 3010}`
const j = (r: Response) => r.json()

export const costTrackerTools: McpTool[] = [
  {
    name: 'get_daily_costs',
    description:
      'Get today\'s API cost breakdown: OpenAI tokens, ElevenLabs characters, ' +
      'HeyGen/Runway minutes, and total spend in USD.',
    schema: {
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (default: today)' }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.date) p.set('date', String(args.date))
      return j(await fetch(`${BASE}/costs/daily?${p}`))
    }
  },
  {
    name: 'get_video_roi',
    description:
      'Get the full cost-vs-revenue ROI breakdown for a specific video: ' +
      'production cost, estimated revenue, net profit, ROI %.',
    schema: {
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or internal pipeline video ID' }
      },
      required: ['videoId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/costs/roi/${args.videoId}`))
  },
  {
    name: 'get_monthly_summary',
    description:
      'Get monthly financial summary: total production costs, total estimated revenue, ' +
      'profit per video, most/least profitable niches.',
    schema: {
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format (default: current month)' }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.month) p.set('month', String(args.month))
      return j(await fetch(`${BASE}/costs/monthly?${p}`))
    }
  },
  {
    name: 'get_budget_alerts',
    description:
      'Check which services are approaching their daily/monthly budget limits. ' +
      'Returns alerts if any service is above 80% of budget.',
    schema: { properties: {} },
    handler: async () =>
      j(await fetch(`${BASE}/costs/alerts`))
  }
]
