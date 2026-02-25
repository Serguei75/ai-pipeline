import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerAnalyticsTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("analytics-engine", "1.0.0");
  registerAnalyticsTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
