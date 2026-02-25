import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerCompetitorTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("competitor-intelligence", "1.0.0");
  registerCompetitorTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
