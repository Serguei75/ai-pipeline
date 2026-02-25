import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.ANALYTICS_ENGINE_URL ?? "http://localhost:3005";
const api = axios.create({ baseURL: BASE, timeout: 15000 });

export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "get_channel_stats",
    "Get overall YouTube channel performance metrics: views, watch time, subscribers, revenue.",
    {
      channel_id: z.string().optional().describe("YouTube channel ID (uses configured default if omitted)"),
      period: z.enum(["7d", "30d", "90d", "365d", "all"]).default("30d"),
    },
    async (params) => {
      const { data } = await api.get("/api/analytics/channel", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_video_performance",
    "Get full performance breakdown for a specific video: CTR, retention curve, traffic sources, revenue.",
    {
      video_id: z.string().describe("YouTube video ID"),
    },
    async ({ video_id }) => {
      const { data } = await api.get(`/api/analytics/video/${video_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_revenue_report",
    "Get detailed revenue report: AdSense CPM, RPM, memberships, Super Chat — broken down by date/video/country.",
    {
      period: z.enum(["7d", "30d", "90d", "365d"]).default("30d"),
      breakdown_by: z.enum(["video", "country", "device", "date"]).default("date"),
    },
    async (params) => {
      const { data } = await api.get("/api/analytics/revenue", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_top_performing_videos",
    "Get top videos ranked by a specific performance metric over a time period.",
    {
      limit: z.number().int().min(1).max(50).default(10),
      metric: z.enum(["views", "revenue", "ctr", "retention", "subscribers", "watch_time"]).default("views"),
      period: z.enum(["7d", "30d", "90d", "365d"]).default("30d"),
    },
    async (params) => {
      const { data } = await api.get("/api/analytics/top-videos", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "predict_performance",
    "Predict expected views, CTR, and revenue for a video before publishing, based on historical patterns.",
    {
      title: z.string(),
      topic: z.string(),
      duration_minutes: z.number().optional(),
      thumbnail_style: z.string().optional(),
      publish_time: z.string().optional().describe("ISO datetime of planned publish"),
    },
    async (params) => {
      const { data } = await api.post("/api/analytics/predict", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_audience_insights",
    "Get audience demographics, geography, device breakdown, and peak watch times.",
    {
      period: z.enum(["30d", "90d", "365d"]).default("90d"),
    },
    async (params) => {
      const { data } = await api.get("/api/analytics/audience", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
