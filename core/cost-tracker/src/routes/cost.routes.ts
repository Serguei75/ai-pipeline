import type { FastifyInstance } from 'fastify';
import {
  getVideoCostBreakdown,
  getChannelCostSummary,
  recordCostEvent,
  updateVideoRevenue,
} from '../services/cost.service.js';

export async function costRoutes(app: FastifyInstance): Promise<void> {

  /**
   * GET /costs/video/:videoId
   * Full cost breakdown for a single video + ROI if published.
   */
  app.get('/costs/video/:videoId', async (req, reply) => {
    const { videoId } = req.params as { videoId: string };
    const breakdown = await getVideoCostBreakdown(videoId);
    if (!breakdown) return reply.code(404).send({ error: 'Video not found' });
    return reply.send(breakdown);
  });

  /**
   * GET /costs/channel/:channelId/summary?days=30
   * Channel-level cost + revenue + ROI summary.
   */
  app.get('/costs/channel/:channelId/summary', async (req, reply) => {
    const { channelId } = req.params as { channelId: string };
    const { days } = (req.query as { days?: string });
    const summary = await getChannelCostSummary(channelId, days ? Number(days) : 30);
    return reply.send(summary);
  });

  /**
   * POST /costs/events
   * Manually record a cost event (for modules that don't use Event Bus).
   */
  app.post('/costs/events', async (req, reply) => {
    const body = req.body as any;
    const event = await recordCostEvent(
      body.videoId, body.channelId, body.category,
      body.provider, body.units, body.unitLabel,
      `${body.provider}:${body.unitType}`,
      body.metadata,
    );
    return reply.code(201).send(event);
  });

  /**
   * PATCH /costs/video/:videoId/revenue
   * Update revenue for a video after YouTube analytics come in.
   */
  app.patch('/costs/video/:videoId/revenue', async (req, reply) => {
    const { videoId } = req.params as { videoId: string };
    const { revenueUsd, views } = req.body as { revenueUsd: number; views: number };
    await updateVideoRevenue(videoId, revenueUsd, views);
    return reply.send({ ok: true });
  });

  /**
   * GET /costs/pricing
   * Current pricing table for all providers.
   */
  app.get('/costs/pricing', async (_req, reply) => {
    const { UNIT_PRICING } = await import('../types.js');
    return reply.send(
      Object.entries(UNIT_PRICING).map(([key, price]) => {
        const [provider, type] = key.split(':');
        const unit =
          type === 'input' || type === 'output' ? 'per 1M tokens' :
          type === 'chars'   ? 'per 1M characters' :
          type === 'minutes' ? 'per minute' :
          type === 'image'   ? 'per image' :
          type === 'gb_month'? 'per GB/month' : 'per unit';
        return { key, provider, type, priceUsd: price, unit };
      })
    );
  });

  /** GET /costs/health */
  app.get('/costs/health', async (_req, reply) => {
    return reply.send({ status: 'ok', service: 'cost-tracker', port: 3010 });
  });
}
