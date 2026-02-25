import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerHookTesterTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("hook-tester", "1.0.0");
  registerHookTesterTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
