# @ai-pipeline/mcp-adapter

Shared **MCP (Model Context Protocol)** HTTP adapter for all AI Pipeline Fastify services.

Implements **JSON-RPC 2.0** over HTTP POST `/mcp/`  
Compatible with **[HKUDS/nanobot](https://github.com/HKUDS/nanobot)** MCP HTTP transport.

## Usage

```typescript
import { mcpAdapter, McpTool } from '../../shared/mcp/src'

const tools: McpTool[] = [
  {
    name: 'my_tool',
    description: 'Does something useful',
    schema: {
      properties: {
        input: { type: 'string', description: 'Input value' }
      },
      required: ['input']
    },
    handler: async (args) => {
      return { result: `Processed: ${args.input}` }
    }
  }
]

// Register in your Fastify app
await fastify.register(mcpAdapter, {
  serverName: 'my-service',
  serverVersion: '1.0.0',
  tools
})
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/mcp/` | Tool discovery (human & machine readable) |
| `POST` | `/mcp/` | JSON-RPC 2.0 dispatcher |

## Supported JSON-RPC Methods

| Method | Description |
|--------|-------------|
| `initialize` | MCP protocol handshake |
| `tools/list` | List all available tools |
| `tools/call` | Execute a tool by name |
| `notifications/initialized` | No-op (protocol conformance) |

## NanoBot Config

```json
{
  "tools": {
    "mcpServers": {
      "my-service": {
        "url": "http://my-service:3001/mcp/",
        "toolTimeout": 30
      }
    }
  }
}
```
