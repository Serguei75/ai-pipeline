import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerTopicTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("topic-engine", "1.0.0");
  registerTopicTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
