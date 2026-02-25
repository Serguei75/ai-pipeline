import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerCostTrackerTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("cost-tracker", "1.0.0");
  registerCostTrackerTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
