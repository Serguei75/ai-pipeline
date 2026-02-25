import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

const BASE = process.env.COST_TRACKER_URL ?? "http://localhost:3011";
const api = axios.create({ baseURL: BASE, timeout: 10000 });

export function registerCostTrackerTools(server: McpServer): void {
  server.tool(
    "get_current_costs",
    "Get current API cost breakdown by service, provider, and operation type.",
    {
      period: z.enum(["today", "7d", "30d", "mtd", "ytd"]).default("mtd"),
      service: z.string().optional().describe("Filter by service name (e.g. voice-engine)"),
      breakdown: z.enum(["service", "provider", "operation", "date"]).default("service"),
    },
    async (params) => {
      const { data } = await api.get("/api/costs/current", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_budget_status",
    "Get current month's budget utilization: spent, remaining, burn rate, and alert thresholds.",
    {},
    async () => {
      const { data } = await api.get("/api/costs/budget");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_cost_per_video",
    "Get average cost to produce one complete video, broken down by pipeline stage.",
    {
      video_type: z.enum(["short_3min", "standard_10min", "long_20min", "localized"]).default("standard_10min"),
      period: z.enum(["7d", "30d", "90d"]).default("30d"),
    },
    async (params) => {
      const { data } = await api.get("/api/costs/per-video", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_cost_forecast",
    "Forecast projected costs for the next N days based on current usage patterns.",
    {
      days_ahead: z.number().int().min(1).max(90).default(30),
      include_breakdown: z.boolean().default(true),
    },
    async (params) => {
      const { data } = await api.get("/api/costs/forecast", { params });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "set_budget_alert",
    "Configure a budget alert threshold for a specific service or total pipeline.",
    {
      service: z.string().optional().describe("Service name or 'total' for pipeline-wide"),
      threshold_usd: z.number().positive(),
      alert_type: z.enum(["absolute", "percentage"]).default("absolute"),
      notify_via: z.enum(["telegram", "email", "both"]).default("telegram"),
    },
    async (params) => {
      const { data } = await api.post("/api/costs/alerts", params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
