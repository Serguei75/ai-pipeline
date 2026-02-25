import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.SCRIPT_ENGINE_URL ?? "http://localhost:3002";
const api = axios.create({ baseURL: BASE, timeout: 60000 });

export function registerScriptTools(server: McpServer): void {
  server.tool(
    "generate_script",
    "Generate a complete YouTube video script. Includes hook, chapters, CTA and description.",
    {
      topic: z.string().describe("Video topic"),
      style: z
        .enum(["educational", "entertaining", "news", "story", "tutorial", "debate"])
        .default("educational"),
      duration_minutes: z.number().min(1).max(60).default(10),
      language: z.string().default("en"),
      target_audience: z.string().optional().describe("e.g. 'developers aged 25-35'"),
      tone: z.enum(["casual", "formal", "humorous", "dramatic"]).default("casual"),
    },
    async (params) => {
      const { data } = await api.post("/api/scripts/generate", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "improve_hook",
    "Rewrite the opening hook (first 30-60 seconds) of a script to maximize viewer retention.",
    {
      hook_text: z.string().describe("Current hook text"),
      topic: z.string(),
      target_audience: z.string().optional(),
      hook_style: z
        .enum(["curiosity_gap", "bold_statement", "story", "question", "controversy"])
        .default("curiosity_gap"),
    },
    async (params) => {
      const { data } = await api.post("/api/scripts/improve-hook", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_outline",
    "Create a structured video outline with timestamps and chapter descriptions.",
    {
      topic: z.string(),
      chapters_count: z.number().int().min(3).max(15).default(7),
      duration_minutes: z.number().default(10),
      style: z.enum(["chapters", "timestamps", "sections"]).default("timestamps"),
    },
    async (params) => {
      const { data } = await api.post("/api/scripts/outline", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "rewrite_section",
    "Rewrite a section of script with different tone, style or audience focus.",
    {
      text: z.string().describe("Text section to rewrite"),
      tone: z
        .enum(["casual", "formal", "humorous", "dramatic", "educational"])
        .default("casual"),
      target_audience: z.string().optional(),
      preserve_facts: z.boolean().default(true),
      max_length_chars: z.number().optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/scripts/rewrite-section", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_script",
    "Retrieve a previously generated script by its ID.",
    {
      script_id: z.string().describe("Script UUID"),
    },
    async ({ script_id }) => {
      const { data } = await api.get(`/api/scripts/${script_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "generate_description",
    "Generate an SEO-optimized YouTube description with timestamps and links.",
    {
      script_id: z.string().optional(),
      topic: z.string(),
      include_timestamps: z.boolean().default(true),
      include_links: z.boolean().default(true),
      language: z.string().default("en"),
    },
    async (params) => {
      const { data } = await api.post("/api/scripts/generate-description", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
