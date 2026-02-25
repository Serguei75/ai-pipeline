import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.COMPETITOR_INTEL_URL ?? "http://localhost:3006";
const api = axios.create({ baseURL: BASE, timeout: 45000 });

export function registerCompetitorTools(server: McpServer): void {
  server.tool(
    "scan_channel",
    "Deep-scan a competitor YouTube channel: top videos, upload cadence, engagement patterns, revenue estimate.",
    {
      channel_url: z.string().describe("YouTube channel URL or @handle"),
      depth: z.enum(["quick", "full", "deep"]).default("full"),
      include_revenue_estimate: z.boolean().default(true),
    },
    async (params) => {
      const { data } = await api.post("/api/competitor/scan-channel", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_content_gaps",
    "Find topics competitors cover that we don't — ranked by opportunity size (traffic x competition).",
    {
      my_channel: z.string().describe("Our channel @handle or ID"),
      competitor_channels: z.array(z.string()).min(1).max(10),
      niche: z.string().optional(),
      min_opportunity_score: z.number().min(0).max(100).default(50),
    },
    async (params) => {
      const { data } = await api.post("/api/competitor/content-gaps", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "track_keyword_rankings",
    "Track YouTube search ranking positions for target keywords across regions.",
    {
      keywords: z.array(z.string()).min(1).max(50),
      region: z.string().default("US"),
      include_competitors: z.boolean().default(true),
    },
    async (params) => {
      const { data } = await api.post("/api/competitor/keyword-rankings", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_viral_patterns",
    "Analyze patterns behind viral videos in a niche: title formulas, thumbnail styles, optimal length.",
    {
      niche: z.string(),
      min_views: z.number().default(100000),
      period: z.enum(["7d", "30d", "90d"]).default("30d"),
      limit: z.number().int().default(20),
    },
    async (params) => {
      const { data } = await api.post("/api/competitor/viral-patterns", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_recent_uploads",
    "Get the most recent uploads from tracked competitor channels with performance metrics.",
    {
      hours_ago: z.number().int().min(1).max(168).default(24),
      min_views: z.number().default(0),
      limit: z.number().int().default(20),
    },
    async (params) => {
      const { data } = await api.get("/api/competitor/recent-uploads", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
