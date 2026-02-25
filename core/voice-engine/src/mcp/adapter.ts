import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerVoiceTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("voice-engine", "1.0.0");
  registerVoiceTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
