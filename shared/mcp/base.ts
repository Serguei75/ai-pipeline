import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Application, Request, Response } from "express";

export function createMcpServer(name: string, version = "1.0.0"): McpServer {
  return new McpServer({ name, version });
}

export function mountMcpEndpoint(
  app: Application,
  server: McpServer,
  path = "/mcp"
): void {
  const handleMcp = async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
  app.post(path, handleMcp);
  app.get(path, handleMcp);
  console.log(`[MCP] ${name} mounted at ${path}`);
}
