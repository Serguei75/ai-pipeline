import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.LOCALIZATION_ENGINE_URL ?? "http://localhost:3008";
const api = axios.create({ baseURL: BASE, timeout: 60000 });

const LANGS = ["en", "ru", "de", "fr", "es", "pt", "ja", "ko", "zh", "ar", "hi", "it", "pl"] as const;

export function registerLocalizationTools(server: McpServer): void {
  server.tool(
    "translate_content",
    "Translate text preserving tone, style, and domain-specific terminology.",
    {
      text: z.string().max(100000),
      source_lang: z.enum(LANGS).default("en"),
      target_lang: z.enum(LANGS),
      domain: z.enum(["general", "technical", "marketing", "education", "news"]).default("education"),
      preserve_formatting: z.boolean().default(true),
    },
    async (params) => {
      const { data } = await api.post("/api/localization/translate", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "localize_script",
    "Localize a complete video script for multiple target markets (translates + adapts cultural references). Returns job_id.",
    {
      script_id: z.string(),
      target_languages: z.array(z.enum(LANGS)).min(1).max(10),
      adapt_cultural_references: z.boolean().default(true),
      include_voice_synthesis: z.boolean().default(false),
    },
    async (params) => {
      const { data } = await api.post("/api/localization/localize-script", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_localization_job",
    "Poll the status of a localization job. Returns translated scripts when status=done.",
    {
      job_id: z.string(),
    },
    async ({ job_id }) => {
      const { data } = await api.get(`/api/localization/jobs/${job_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "detect_language",
    "Detect the language of a text and return confidence scores for top candidates.",
    {
      text: z.string().max(5000),
    },
    async ({ text }) => {
      const { data } = await api.post("/api/localization/detect", { text });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_market_readiness",
    "Score how ready a piece of content is for a target market (cultural fit, SEO localization, legal concerns).",
    {
      content: z.string(),
      target_market: z.enum(["US", "DE", "RU", "JP", "BR", "IN", "FR", "CN", "KR"]),
    },
    async (params) => {
      const { data } = await api.post("/api/localization/market-readiness", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
