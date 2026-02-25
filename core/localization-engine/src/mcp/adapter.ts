import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerLocalizationTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("localization-engine", "1.0.0");
  registerLocalizationTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
