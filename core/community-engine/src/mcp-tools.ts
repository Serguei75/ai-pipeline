/**
 * Community Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   get_pending_replies   — comments waiting for AI-drafted reply approval
 *   approve_reply         — approve a reply draft → posts to YouTube
 *   get_suggested_topics  — topics extracted from recurring questions
 *   sync_comments         — force sync comments from YouTube for a video
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3006}`
const j = (r: Response) => r.json()

export const communityEngineTools: McpTool[] = [
  {
    name: 'get_pending_replies',
    description:
      'Get AI-drafted comment replies waiting for human approval. ' +
      'Returns comment text, suggested reply, sentiment, and classification.',
    schema: {
      properties: {
        limit: { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams({ status: 'PENDING' })
      if (args.limit) p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/comments/drafts?${p}`))
    }
  },
  {
    name: 'approve_reply',
    description: 'Approve an AI-drafted reply to post it on YouTube.',
    schema: {
      properties: {
        draftId:     { type: 'string', description: 'Reply draft ID to approve' },
        editedReply: { type: 'string', description: 'Optional: edited reply text (if you want to change the draft)' }
      },
      required: ['draftId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/comments/drafts/${args.draftId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedReply: args.editedReply })
      }))
  },
  {
    name: 'get_suggested_topics',
    description:
      'Get video topic ideas extracted from recurring viewer questions in comments. ' +
      'These are high-demand topics the audience is already asking for.',
    schema: {
      properties: {
        minOccurrences: { type: 'number', description: 'Min times question asked (default 3)', default: 3 },
        limit:          { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.minOccurrences) p.set('minOccurrences', String(args.minOccurrences))
      if (args.limit)          p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/topics/suggestions?${p}`))
    }
  },
  {
    name: 'sync_comments',
    description: 'Force sync latest comments from YouTube for a specific video.',
    schema: {
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID (e.g. dQw4w9WgXcQ)' }
      },
      required: ['videoId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/comments/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: args.videoId })
      }))
  }
]
