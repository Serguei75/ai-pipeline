import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.HOOK_TESTER_URL ?? "http://localhost:3007";
const api = axios.create({ baseURL: BASE, timeout: 15000 });

export function registerHookTesterTools(server: McpServer): void {
  server.tool(
    "score_hook",
    "Score a video title or opening hook by predicted CTR, retention, and shareability (0-100 each).",
    {
      hook_text: z.string().describe("Video title or opening hook sentence"),
      target_audience: z.string().optional(),
      niche: z.string().optional(),
      hook_type: z.enum(["title", "opening_line", "thumbnail_text"]).default("title"),
    },
    async (params) => {
      const { data } = await api.post("/api/hooks/score", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "generate_hook_variants",
    "Generate multiple title/hook variants using different psychological triggers for A/B testing.",
    {
      topic: z.string(),
      count: z.number().int().min(2).max(20).default(5),
      styles: z
        .array(z.enum(["curiosity_gap", "shock", "howto", "listicle", "story", "question", "controversy"]))
        .default(["curiosity_gap", "howto", "listicle"]),
      target_audience: z.string().optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/hooks/generate-variants", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "compare_hooks",
    "Compare and rank multiple hooks/titles by predicted performance. Returns winner with reasoning.",
    {
      hooks: z.array(z.string()).min(2).max(10),
      metric: z.enum(["ctr", "retention", "combined"]).default("combined"),
      niche: z.string().optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/hooks/compare", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_best_hook_formula",
    "Get proven hook formulas for a specific niche based on top-performing videos analysis.",
    {
      niche: z.string(),
      style: z.enum(["curiosity_gap", "shock", "howto", "listicle", "story", "question"]).optional(),
    },
    async (params) => {
      const { data } = await api.get("/api/hooks/formulas", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
