/**
 * Media Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   list_media_jobs  — active video rendering jobs
 *   get_media_job    — specific job status
 *   retry_media_job  — retry failed render
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3004}`
const j = (r: Response) => r.json()

export const mediaEngineTools: McpTool[] = [
  {
    name: 'list_media_jobs',
    description:
      'List video rendering/media assembly jobs. Shows status, script title, ' +
      'estimated completion time, and output file URL.',
    schema: {
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['PENDING', 'RENDERING', 'DONE', 'FAILED'] },
        limit:  { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.status) p.set('status', String(args.status))
      if (args.limit)  p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/media-jobs?${p}`))
    }
  },
  {
    name: 'get_media_job',
    description: 'Get details and output URL of a specific media rendering job.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Media job ID' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/media-jobs/${args.id}`))
  },
  {
    name: 'retry_media_job',
    description: 'Retry a FAILED video rendering job.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Media job ID to retry' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/media-jobs/${args.id}/retry`, { method: 'POST' }))
  }
]
