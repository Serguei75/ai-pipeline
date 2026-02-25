import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerCommunityTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("community-engine", "1.0.0");
  registerCommunityTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
