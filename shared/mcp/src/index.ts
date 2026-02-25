/**
 * @ai-pipeline/mcp-adapter
 *
 * Shared MCP (Model Context Protocol) HTTP adapter for AI Pipeline Fastify services.
 * Implements JSON-RPC 2.0 over HTTP POST /mcp/
 * Compatible with HKUDS/nanobot MCP HTTP transport.
 *
 * Usage in any service:
 *   import { mcpAdapter } from '../../shared/mcp/src'
 *   import { myServiceTools } from './mcp-tools'
 *   await fastify.register(mcpAdapter, { serverName: 'my-service', tools: myServiceTools })
 */

import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McpPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  default?: unknown
  items?: { type: string }
}

export interface McpToolSchema {
  properties: Record<string, McpPropertySchema>
  required?: string[]
}

export interface McpTool {
  name: string
  description: string
  schema: McpToolSchema
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

export interface McpAdapterOptions {
  serverName: string
  serverVersion?: string
  tools: McpTool[]
}

// ─── JSON-RPC 2.0 helpers ─────────────────────────────────────────────────────

const rpcOk = (id: unknown, result: unknown) =>
  ({ jsonrpc: '2.0' as const, id, result })

const rpcErr = (id: unknown, code: number, message: string) =>
  ({ jsonrpc: '2.0' as const, id, error: { code, message } })

const toMeta = (tool: McpTool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: { type: 'object' as const, ...tool.schema }
})

// ─── Fastify Plugin ───────────────────────────────────────────────────────────

export const mcpAdapter = fp(
  async (fastify: FastifyInstance, opts: McpAdapterOptions) => {
    const version = opts.serverVersion ?? '1.0.0'
    const toolMap = new Map<string, McpTool>(opts.tools.map(t => [t.name, t]))

    // GET /mcp/ — capability discovery (human-readable & machine-readable)
    fastify.get('/mcp', async (_req, reply) => {
      reply.header('Content-Type', 'application/json')
      return {
        protocolVersion: '2024-11-05',
        serverInfo: { name: opts.serverName, version },
        capabilities: { tools: {} },
        tools: opts.tools.map(toMeta)
      }
    })

    // POST /mcp/ — JSON-RPC 2.0 dispatcher
    fastify.post('/mcp', async (req, _reply) => {
      const body = (req.body as any) ?? {}
      const { id, method, params } = body

      switch (method) {

        // ── Protocol handshake ─────────────────────────────────────────────
        case 'initialize':
          return rpcOk(id, {
            protocolVersion: '2024-11-05',
            serverInfo: { name: opts.serverName, version },
            capabilities: { tools: {} }
          })

        // ── Tool discovery ─────────────────────────────────────────────────
        case 'tools/list':
          return rpcOk(id, { tools: opts.tools.map(toMeta) })

        // ── Tool execution ─────────────────────────────────────────────────
        case 'tools/call': {
          const toolName = params?.name as string | undefined
          const args: Record<string, unknown> = params?.arguments ?? {}

          if (!toolName)
            return rpcErr(id, -32602, 'Missing params.name')

          const tool = toolMap.get(toolName)
          if (!tool)
            return rpcErr(id, -32601, `Tool not found: ${toolName}`)

          try {
            const result = await tool.handler(args)
            return rpcOk(id, {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            })
          } catch (err: any) {
            fastify.log.error({ tool: toolName, err }, '[MCP] Tool execution error')
            return rpcErr(id, -32603, err?.message ?? 'Internal server error')
          }
        }

        // ── No-op notifications ────────────────────────────────────────────
        case 'notifications/initialized':
        case 'notifications/cancelled':
          return {}

        default:
          return rpcErr(id, -32601, `Method not supported: ${method}`)
      }
    })

    fastify.log.info(
      { server: opts.serverName, toolCount: opts.tools.length },
      '🔌 MCP adapter ready — GET|POST /mcp/'
    )
  },
  { name: 'mcp-adapter', fastify: '4.x' }
)
