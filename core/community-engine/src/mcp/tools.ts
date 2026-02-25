import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.COMMUNITY_ENGINE_URL ?? "http://localhost:3009";
const api = axios.create({ baseURL: BASE, timeout: 15000 });

export function registerCommunityTools(server: McpServer): void {
  server.tool(
    "get_pending_comments",
    "Fetch comments awaiting moderation or reply, sorted by priority.",
    {
      video_id: z.string().optional().describe("Filter to a specific video (all if omitted)"),
      limit: z.number().int().min(1).max(100).default(20),
      priority: z.enum(["urgent", "all", "unanswered", "high_engagement"]).default("unanswered"),
    },
    async (params) => {
      const { data } = await api.get("/api/community/comments/pending", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "generate_reply",
    "Generate a contextual reply to a YouTube comment matching the channel's voice.",
    {
      comment_text: z.string(),
      video_title: z.string().optional(),
      channel_niche: z.string().optional(),
      tone: z.enum(["friendly", "professional", "humorous", "supportive", "educational"]).default("friendly"),
      include_cta: z.boolean().default(false).describe("Include call-to-action (subscribe, etc.)"),
      max_length: z.number().int().default(200),
    },
    async (params) => {
      const { data } = await api.post("/api/community/generate-reply", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_sentiment_analysis",
    "Analyze comment sentiment distribution for a video (positive/neutral/negative + top themes).",
    {
      video_id: z.string(),
      sample_size: z.number().int().min(50).max(5000).default(500),
    },
    async (params) => {
      const { data } = await api.post("/api/community/sentiment", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "bulk_moderate",
    "Apply automated moderation rules to a video's comment section.",
    {
      video_id: z.string(),
      actions: z.array(
        z.enum(["remove_spam", "hide_toxic", "approve_positive", "auto_reply_questions", "pin_top_comment"])
      ),
      dry_run: z.boolean().default(false).describe("Preview changes without applying"),
    },
    async (params) => {
      const { data } = await api.post("/api/community/bulk-moderate", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_top_comments",
    "Get top comments by likes/replies for a video — useful for understanding audience reaction.",
    {
      video_id: z.string(),
      limit: z.number().int().default(10),
      sort_by: z.enum(["likes", "replies", "recency"]).default("likes"),
    },
    async (params) => {
      const { data } = await api.get("/api/community/comments/top", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
