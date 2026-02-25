/**
 * Topic Engine — MCP Tools
 * Registered via: fastify.register(mcpAdapter, { serverName: 'topic-engine', tools: topicEngineTools })
 *
 * Tools exposed to NanoBot:
 *   search_topics       — search/filter topics
 *   get_trending_topics — top topics by viral score
 *   create_topic        — add a new topic idea
 *   approve_topic       — approve → triggers script generation
 *   get_pipeline_status — full pipeline overview
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3001}`
const j = (r: Response) => r.json()

export const topicEngineTools: McpTool[] = [
  {
    name: 'search_topics',
    description:
      'Search for video topics in the database. Returns a list of topics matching the query. ' +
      'Use this to check what topics already exist before creating a new one.',
    schema: {
      properties: {
        query:  { type: 'string', description: 'Full-text search query' },
        niche:  { type: 'string', description: 'Niche filter', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        status: { type: 'string', description: 'Status filter', enum: ['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'DONE'] },
        limit:  { type: 'number', description: 'Max results (default 10)', default: 10 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams()
      if (args.query)  p.set('q', String(args.query))
      if (args.niche)  p.set('niche', String(args.niche))
      if (args.status) p.set('status', String(args.status))
      if (args.limit)  p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/topics?${p}`))
    }
  },
  {
    name: 'get_trending_topics',
    description:
      'Get trending video topic ideas sorted by viral score descending. ' +
      'Use this to find the best topics to produce next.',
    schema: {
      properties: {
        niche: { type: 'string', description: 'Filter by niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        limit: { type: 'number', description: 'How many topics (default 5)', default: 5 }
      }
    },
    handler: async (args) => {
      const p = new URLSearchParams({ sort: 'viralScore', order: 'desc', status: 'PENDING' })
      if (args.niche) p.set('niche', String(args.niche))
      if (args.limit) p.set('limit', String(args.limit))
      return j(await fetch(`${BASE}/topics?${p}`))
    }
  },
  {
    name: 'create_topic',
    description:
      'Create a new video topic idea and add it to the pipeline queue. ' +
      'The topic will be in PENDING state until approved.',
    schema: {
      properties: {
        title:       { type: 'string', description: 'Video title / topic idea (clear, compelling)' },
        description: { type: 'string', description: 'Why this topic will perform well' },
        niche:       { type: 'string', description: 'Content niche', enum: ['AI', 'FINANCE', 'HEALTH', 'TECH'] },
        channel:     { type: 'string', description: 'Target channel', enum: ['FUEL', 'INTELLECTUAL'] },
        viralScore:  { type: 'number', description: 'Estimated viral score 0-100' }
      },
      required: ['title', 'niche']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }))
  },
  {
    name: 'approve_topic',
    description:
      'Approve a PENDING topic to start the production pipeline. ' +
      'This triggers automatic script generation via Event Bus.',
    schema: {
      properties: {
        id: { type: 'string', description: 'Topic ID to approve' }
      },
      required: ['id']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/topics/${args.id}/approve`, { method: 'PATCH' }))
  },
  {
    name: 'get_pipeline_status',
    description:
      'Get a full overview of the content pipeline: how many topics at each stage, ' +
      'what is in production, and what needs attention.',
    schema: { properties: {} },
    handler: async () => {
      const [pending, inProgress, done] = await Promise.all([
        j(await fetch(`${BASE}/topics?status=PENDING&limit=100`)),
        j(await fetch(`${BASE}/topics?status=IN_PROGRESS&limit=100`)),
        j(await fetch(`${BASE}/topics?status=DONE&limit=10&sort=updatedAt&order=desc`))
      ])
      return {
        summary: {
          pendingApproval: pending?.total ?? 0,
          inProduction: inProgress?.total ?? 0,
          recentlyDone: done?.data?.length ?? 0
        },
        pending: pending?.data ?? [],
        inProgress: inProgress?.data ?? [],
        recentDone: done?.data ?? []
      }
    }
  }
]
