import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.VOICE_ENGINE_URL ?? "http://localhost:3003";
const api = axios.create({ baseURL: BASE, timeout: 30000 });

export function registerVoiceTools(server: McpServer): void {
  server.tool(
    "synthesize_voice",
    "Convert text to speech. Returns job_id — use get_voice_job to poll for completion.",
    {
      text: z.string().max(50000).describe("Text to synthesize into audio"),
      voice_id: z.string().default("default").describe("Voice ID from list_voices"),
      language: z.string().default("en"),
      speed: z.number().min(0.5).max(2.0).default(1.0),
      pitch: z.number().min(-20).max(20).default(0),
      output_format: z.enum(["mp3", "wav", "ogg"]).default("mp3"),
    },
    async (params) => {
      const { data } = await api.post("/api/voice/synthesize", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_voice_job",
    "Check status of a voice synthesis job. When status=done, result_url contains download link.",
    {
      job_id: z.string(),
    },
    async ({ job_id }) => {
      const { data } = await api.get(`/api/voice/jobs/${job_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "list_voices",
    "List available TTS voices with language, gender, and provider filters.",
    {
      language: z.string().optional().describe("Filter by language code (en, ru, de...)"),
      gender: z.enum(["male", "female", "neutral"]).optional(),
      provider: z.enum(["elevenlabs", "openai", "google", "local", "all"]).default("all"),
      limit: z.number().int().default(20),
    },
    async (params) => {
      const { data } = await api.get("/api/voice/voices", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "clone_voice",
    "Clone a custom voice from an audio sample (min 30s, max 5min, clear speech required).",
    {
      audio_url: z.string().url().describe("CDN URL to the voice sample audio file"),
      name: z.string().max(60).describe("Label for the cloned voice"),
      description: z.string().optional(),
      language: z.string().default("en"),
    },
    async (params) => {
      const { data } = await api.post("/api/voice/clone", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_voice_preview",
    "Generate a short audio preview for a voice ID with sample text.",
    {
      voice_id: z.string(),
      sample_text: z.string().default("Hello! This is a preview of my voice."),
    },
    async (params) => {
      const { data } = await api.post("/api/voice/preview", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
