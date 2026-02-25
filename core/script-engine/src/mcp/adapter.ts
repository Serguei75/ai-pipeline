import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerScriptTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("script-engine", "1.0.0");
  registerScriptTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
