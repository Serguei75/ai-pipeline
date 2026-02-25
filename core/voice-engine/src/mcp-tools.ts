/**
 * Voice Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   list_voice_jobs  — active voice generation jobs
 *   get_voice_job    — status of a specific job
 *   retry_voice_job  — retry a failed job
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3003}`
const j = (r: Response) => r.json()

export const voiceEngineTools: McpTool[] = [
  {
    name: 'list_voice_jobs',
    description:
      'List active or recent voice generation jobs. Shows status, script title, ' +
      'duration, and ElevenLabs job ID.',
    schema: {
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['PENDING', 'PROCESSING', 'DONE', 'FAILED'] },
        limit:  { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.status) p.set('status', String(args.status))
      if (args.limit)  p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/voice-jobs?${p}`))
    }
  },
  {
    name: 'get_voice_job',
    description: 'Get details of a specific voice generation job including audio file URL.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Voice job ID' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/voice-jobs/${args.id}`))
  },
  {
    name: 'retry_voice_job',
    description: 'Retry a FAILED voice generation job.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Voice job ID to retry' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/voice-jobs/${args.id}/retry`, { method: 'POST' }))
  }
]
