/**
 * Localization Engine — MCP Tools
 * Tools exposed to NanoBot:
 *   create_localization_task — start localizing a video to new languages
 *   get_task_status         — check localization progress
 *   list_localized_assets   — get all localized assets for a video
 */

import type { McpTool } from '../../shared/mcp/src'

const BASE = `http://localhost:${process.env.PORT ?? 3007}`
const j = (r: Response) => r.json()

export const localizationEngineTools: McpTool[] = [
  {
    name: 'create_localization_task',
    description:
      'Start localizing a video to one or more target languages. ' +
      'Stage 1: subtitles + localized title/description. ' +
      'Stage 2: full AI voice dubbing (ElevenLabs). ',
    schema: {
      properties: {
        videoId:   { type: 'string', description: 'Internal video/media job ID' },
        languages: { type: 'array',  description: 'Target language codes, e.g. ["de","es","ja"]', items: { type: 'string' } },
        stage:     { type: 'string', description: 'Localization depth', enum: ['SUBTITLES_ONLY', 'FULL_DUB', 'BOTH'], default: 'SUBTITLES_ONLY' }
      },
      required: ['videoId', 'languages']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/localization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }))
  },
  {
    name: 'get_localization_task_status',
    description: 'Check the progress of a localization task.',
    schema: {
      properties: {
        taskId: { type: 'string', description: 'Localization task ID' }
      },
      required: ['taskId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/localization/${args.taskId}`))
  },
  {
    name: 'list_localized_assets',
    description: 'List all localized SRT files and dubbed audio tracks for a video.',
    schema: {
      properties: {
        videoId: { type: 'string', description: 'Video/media job ID' }
      },
      required: ['videoId']
    },
    handler: async (args) =>
      j(await fetch(`${BASE}/localization/assets?videoId=${args.videoId}`))
  }
]
