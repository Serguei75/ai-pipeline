import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerMediaTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("media-engine", "1.0.0");
  registerMediaTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
