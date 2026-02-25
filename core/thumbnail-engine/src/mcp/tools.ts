import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.THUMBNAIL_ENGINE_URL ?? "http://localhost:3010";
const api = axios.create({ baseURL: BASE, timeout: 60000 });

export function registerThumbnailTools(server: McpServer): void {
  server.tool(
    "generate_thumbnail",
    "Generate a YouTube thumbnail image optimized for high CTR.",
    {
      title: z.string().max(60).describe("Video title to feature on thumbnail"),
      topic: z.string(),
      style: z
        .enum(["bold-text", "face-reaction", "split-screen", "minimal", "meme", "cinematic"])
        .default("bold-text"),
      color_scheme: z.enum(["auto", "red-black", "blue-white", "yellow-black", "green-dark"]).default("auto"),
      face_image_url: z.string().url().optional().describe("Person/face image to include"),
      resolution: z.enum(["1280x720", "1920x1080"]).default("1280x720"),
    },
    async (params) => {
      const { data } = await api.post("/api/thumbnails/generate", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "predict_thumbnail_ctr",
    "AI-score a thumbnail image for predicted CTR potential (0-100) with improvement suggestions.",
    {
      thumbnail_url: z.string().url(),
      niche: z.string().optional(),
      competitor_thumbnails: z.array(z.string().url()).optional().describe("Compare against these"),
    },
    async (params) => {
      const { data } = await api.post("/api/thumbnails/predict-ctr", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_thumbnail_variants",
    "Generate multiple thumbnail variants for A/B testing with predicted CTR for each.",
    {
      title: z.string(),
      topic: z.string(),
      count: z.number().int().min(2).max(8).default(4),
      face_image_url: z.string().url().optional(),
    },
    async (params) => {
      const { data } = await api.post("/api/thumbnails/variants", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "apply_brand_template",
    "Apply the channel's brand template (logo, colors, font) to a generated thumbnail.",
    {
      thumbnail_url: z.string().url(),
      template_id: z.string().default("default"),
      add_logo: z.boolean().default(true),
      add_watermark: z.boolean().default(false),
    },
    async (params) => {
      const { data } = await api.post("/api/thumbnails/apply-brand", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
