import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.TOPIC_ENGINE_URL ?? "http://localhost:3001";
const api = axios.create({ baseURL: BASE, timeout: 15000 });

export function registerTopicTools(server: McpServer): void {
  server.tool(
    "search_topics",
    "Search for YouTube topic ideas with viral potential scores. Returns ranked list with engagement predictions.",
    {
      query: z.string().describe("Search query or niche keyword"),
      language: z.string().default("en").describe("Target language code (en, ru, de...)"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ query, language, limit }) => {
      const { data } = await api.get("/api/topics/search", { params: { query, language, limit } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_trending_topics",
    "Get currently trending YouTube topics in a specific niche and region (updated every 2h).",
    {
      niche: z.string().describe("Content niche: AI, finance, health, gaming, etc."),
      region: z.string().default("US").describe("ISO country code"),
      limit: z.number().int().min(1).max(20).default(5),
    },
    async ({ niche, region, limit }) => {
      const { data } = await api.get("/api/topics/trending", { params: { niche, region, limit } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "analyze_viral_potential",
    "Score the viral potential of a topic (0-100) with breakdown by search volume, competition, and trend velocity.",
    {
      topic: z.string().describe("Topic title or description to analyze"),
      niche: z.string().optional(),
      region: z.string().default("US"),
    },
    async (params) => {
      const { data } = await api.post("/api/topics/analyze-viral", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_topic_suggestions",
    "Get related topic suggestions from a seed topic using different expansion strategies.",
    {
      seed_topic: z.string().describe("Seed topic to expand on"),
      count: z.number().int().min(1).max(30).default(10),
      strategy: z
        .enum(["similar", "adjacent", "contrarian", "trending", "evergreen"])
        .default("trending")
        .describe("Expansion strategy"),
    },
    async (params) => {
      const { data } = await api.post("/api/topics/suggest", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_seo_metadata",
    "Generate SEO-optimized title, description, and tags for a YouTube video topic.",
    {
      topic: z.string(),
      language: z.string().default("en"),
      target_keywords: z.array(z.string()).optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/topics/seo-metadata", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
