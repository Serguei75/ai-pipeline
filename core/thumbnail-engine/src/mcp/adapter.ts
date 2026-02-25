import { createMcpServer, mountMcpEndpoint } from "../../../../shared/mcp/base.js";
import { registerThumbnailTools } from "./tools.js";
import type { Application } from "express";

export function setupMcp(app: Application): void {
  const server = createMcpServer("thumbnail-engine", "1.0.0");
  registerThumbnailTools(server);
  mountMcpEndpoint(app, server, "/mcp");
}
