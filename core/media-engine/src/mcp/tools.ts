import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.MEDIA_ENGINE_URL ?? "http://localhost:3004";
const api = axios.create({ baseURL: BASE, timeout: 30000 });

export function registerMediaTools(server: McpServer): void {
  server.tool(
    "create_video",
    "Assemble a full YouTube video from script + voice + visuals. Long-running — returns job_id.",
    {
      script_id: z.string().describe("Script ID from script-engine"),
      voice_job_id: z.string().describe("Completed voice synthesis job ID"),
      style: z
        .enum(["minimal", "cinematic", "dynamic", "slideshow", "avatar", "screencast"])
        .default("dynamic"),
      resolution: z.enum(["1080p", "4k", "720p"]).default("1080p"),
      add_captions: z.boolean().default(true),
      caption_style: z.enum(["standard", "bold", "minimal", "highlight"]).default("standard"),
      background_music: z.enum(["none", "subtle", "upbeat", "dramatic"]).default("subtle"),
    },
    async (params) => {
      const { data } = await api.post("/api/media/create-video", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_video_job",
    "Check status of a video creation job. When done, result_url contains the final video.",
    {
      job_id: z.string(),
    },
    async ({ job_id }) => {
      const { data } = await api.get(`/api/media/jobs/${job_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "add_subtitles",
    "Add or regenerate subtitles/captions on an existing video file.",
    {
      video_url: z.string().url(),
      language: z.string().default("en"),
      auto_generate: z.boolean().default(true).describe("Auto-generate from audio track"),
      srt_content: z.string().optional().describe("Manual SRT if auto_generate=false"),
      style: z.enum(["standard", "bold", "minimal", "highlight"]).default("standard"),
    },
    async (params) => {
      const { data } = await api.post("/api/media/add-subtitles", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "render_b_roll",
    "Generate B-roll footage for a topic via AI generation or curated stock library.",
    {
      topic: z.string(),
      duration_seconds: z.number().min(5).max(300).default(60),
      style: z.enum(["realistic", "animated", "abstract", "stock", "screencast"]).default("stock"),
      aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      keywords: z.array(z.string()).optional().describe("Keywords to guide visual selection"),
    },
    async (params) => {
      const { data } = await api.post("/api/media/b-roll", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "upload_to_youtube",
    "Upload a finished video to YouTube with full metadata. Defaults to private until manually approved.",
    {
      video_url: z.string().url().describe("CDN URL of the finished video file"),
      title: z.string().max(100),
      description: z.string().max(5000),
      tags: z.array(z.string()).max(30).default([]),
      thumbnail_url: z.string().url().optional().describe("Custom thumbnail URL"),
      category_id: z.string().default("28").describe("YouTube category (28=Science&Tech)"),
      privacy: z.enum(["public", "private", "unlisted"]).default("private"),
      schedule_at: z
        .string()
        .optional()
        .describe("ISO datetime for scheduled publish (requires privacy=private)"),
      playlist_id: z.string().optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/media/upload-youtube", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_active_jobs",
    "List all currently active (pending/processing) media jobs with progress.",
    {
      type: z.enum(["video", "subtitles", "b-roll", "upload", "all"]).default("all"),
    },
    async ({ type }) => {
      const { data } = await api.get("/api/media/jobs/active", { params: { type } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
