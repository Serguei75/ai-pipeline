/**
 * Script Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   list_pending_scripts — scripts waiting for approval
 *   get_script           — get a specific script
 *   generate_script      — generate script for a topic
 *   approve_script       — approve → triggers voice generation
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3002}`
const j = (r: Response) => r.json()

export const scriptEngineTools: McpTool[] = [
  {
    name: 'list_pending_scripts',
    description:
      'List scripts that are waiting for human approval before voice recording. ' +
      'Returns script ID, title, hook text, word count, and estimated duration.',
    schema: {
      properties: {
        limit: { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams({ status: 'PENDING_APPROVAL' })
      if (args.limit) p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/scripts?${p}`))
    }
  },
  {
    name: 'get_script',
    description: 'Get a specific script by ID including full text, hook variants, and metadata.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Script ID' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/scripts/${args.id}`))
  },
  {
    name: 'generate_script',
    description:
      'Generate a new script for an approved topic. Use this when a topic has been approved ' +
      'but no script exists yet, or to regenerate an existing script.',
    schema: {
      properties: {
        topicId: { type: 'string', description: 'Topic ID to generate script for' },
        style:   { type: 'string', description: 'Script style', enum: ['SHORT_FORM', 'LONG_FORM', 'DOCUMENTARY'], default: 'SHORT_FORM' },
        tone:    { type: 'string', description: 'Tone of voice', enum: ['AUTHORITATIVE', 'CONVERSATIONAL', 'EDUCATIONAL'] }
      },
      required: ['topicId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/scripts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }))
  },
  {
    name: 'approve_script',
    description:
      'Approve a script to proceed to voice recording. ' +
      'Publishes script.approved event which triggers Voice Engine.',
    schema: {
      properties: {
        id:    { type: 'string', description: 'Script ID to approve' },
        notes: { type: 'string', description: 'Optional notes for voice/media teams' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/scripts/${args.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: args.notes })
      }))
  }
]
