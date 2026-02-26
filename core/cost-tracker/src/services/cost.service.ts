import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import type { CostEvent, CostCategory, CostProvider, VideoCostBreakdown, ChannelCostSummary } from '../types.js';
import { UNIT_PRICING } from '../types.js';
import * as pino from 'pino';

const logger = pino.default({ level: 'info' });

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: config.DATABASE_URL });
  return pool;
}

/**
 * Calculate cost in USD from units consumed.
 * pricingKey format: '{provider}:{type}' e.g. 'gemini-flash:input'
 * For LLM tokens: units are raw token count (divided by 1M internally)
 */
export function calculateCost(pricingKey: string, units: number): number {
  const pricePerUnit = UNIT_PRICING[pricingKey];
  if (pricePerUnit === undefined) {
    logger.warn({ pricingKey }, 'Unknown pricing key — cost set to 0');
    return 0;
  }
  // LLM tokens and TTS chars are priced per 1M units
  if (pricingKey.includes(':input') || pricingKey.includes(':output') || pricingKey.includes(':chars')) {
    return (units / 1_000_000) * pricePerUnit;
  }
  // Images, minutes: price is per single unit
  return units * pricePerUnit;
}

/** Record a cost event for a specific video pipeline step */
export async function recordCostEvent(
  videoId: string,
  channelId: string,
  category: CostCategory,
  provider: CostProvider,
  units: number,
  unitLabel: string,
  pricingKey: string,
  metadata?: Record<string, unknown>,
): Promise<CostEvent> {
  const costUsd = calculateCost(pricingKey, units);
  const event: CostEvent = {
    id: randomUUID(),
    videoId,
    channelId,
    category,
    provider,
    units,
    unitLabel,
    costUsd,
    metadata,
    createdAt: new Date().toISOString(),
  };

  const db = getPool();
  await db.query(
    `INSERT INTO cost_events
      (id, video_id, channel_id, category, provider, units, unit_label, cost_usd, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      event.id, event.videoId, event.channelId, event.category,
      event.provider, event.units, event.unitLabel,
      event.costUsd, event.metadata ? JSON.stringify(event.metadata) : null,
      event.createdAt,
    ]
  );

  // Update running total snapshot
  await db.query(
    `INSERT INTO video_cost_snapshots (video_id, video_title, channel_id, total_cost_usd, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (video_id) DO UPDATE
       SET total_cost_usd = video_cost_snapshots.total_cost_usd + $4,
           updated_at = NOW()`,
    [videoId, metadata?.videoTitle ?? videoId, channelId, costUsd]
  );

  logger.info({ videoId, provider, costUsd: costUsd.toFixed(6), category }, 'Cost event recorded');
  return event;
}

/** Get full cost breakdown for a single video */
export async function getVideoCostBreakdown(videoId: string): Promise<VideoCostBreakdown | null> {
  const db = getPool();

  const [snapshotRes, eventsRes] = await Promise.all([
    db.query('SELECT * FROM video_cost_snapshots WHERE video_id = $1', [videoId]),
    db.query('SELECT * FROM cost_events WHERE video_id = $1 ORDER BY created_at ASC', [videoId]),
  ]);

  if (!snapshotRes.rows.length) return null;
  const snap = snapshotRes.rows[0];
  const events: CostEvent[] = eventsRes.rows.map((r: any) => ({
    id: r.id, videoId: r.video_id, channelId: r.channel_id,
    category: r.category, provider: r.provider,
    units: Number(r.units), unitLabel: r.unit_label,
    costUsd: Number(r.cost_usd), metadata: r.metadata,
    createdAt: r.created_at,
  }));

  const sum = (cat: CostCategory) =>
    events.filter((e) => e.category === cat).reduce((a, e) => a + e.costUsd, 0);

  const total = Number(snap.total_cost_usd);
  const revenue = snap.revenue_usd != null ? Number(snap.revenue_usd) : null;
  const profit = revenue != null ? revenue - total : null;
  const roi = revenue != null && total > 0 ? ((revenue - total) / total) * 100 : null;
  const views = snap.views ? Number(snap.views) : null;
  const costPerView = views && views > 0 ? total / views : null;

  return {
    videoId,
    videoTitle: snap.video_title,
    channelId: snap.channel_id,
    status: snap.status,
    costs: {
      llmTotal:    sum('llm_input') + sum('llm_output'),
      ttsTotal:    sum('tts_chars'),
      mediaTotal:  sum('media_minutes'),
      imageTotal:  sum('image_generation'),
      storageTotal: sum('storage'),
      other:       sum('api_quota'),
      total,
    },
    events,
    revenueUsd: revenue,
    roiPercent: roi ? parseFloat(roi.toFixed(2)) : null,
    profitUsd: profit,
    costPerView: costPerView ? parseFloat(costPerView.toFixed(6)) : null,
    updatedAt: snap.updated_at,
  };
}

/** Update revenue for a video (called from Analytics Engine when YouTube data arrives) */
export async function updateVideoRevenue(
  videoId: string,
  revenueUsd: number,
  views: number,
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE video_cost_snapshots
     SET revenue_usd  = $2,
         views        = $3,
         roi_percent  = CASE WHEN total_cost_usd > 0
                        THEN (($2 - total_cost_usd) / total_cost_usd) * 100
                        ELSE 0 END,
         profit_usd   = $2 - total_cost_usd,
         cost_per_view = CASE WHEN $3 > 0 THEN total_cost_usd / $3 ELSE 0 END,
         status       = 'published',
         updated_at   = NOW()
     WHERE video_id = $1`,
    [videoId, revenueUsd, views]
  );
  logger.info({ videoId, revenueUsd, views }, 'Video revenue updated');
}

/** Channel cost summary for dashboard */
export async function getChannelCostSummary(
  channelId: string,
  periodDays = 30,
): Promise<ChannelCostSummary> {
  const db = getPool();
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();

  const [eventsRes, snapshotRes] = await Promise.all([
    db.query(
      `SELECT category, provider, SUM(cost_usd) as total
       FROM cost_events
       WHERE channel_id = $1 AND created_at >= $2
       GROUP BY category, provider`,
      [channelId, since]
    ),
    db.query(
      `SELECT
         COUNT(*) as video_count,
         SUM(total_cost_usd) as total_cost,
         SUM(COALESCE(revenue_usd, 0)) as total_revenue,
         SUM(COALESCE(profit_usd, 0)) as total_profit,
         AVG(total_cost_usd) as avg_cost,
         AVG(COALESCE(revenue_usd, 0)) as avg_revenue,
         AVG(COALESCE(roi_percent, 0)) as avg_roi
       FROM video_cost_snapshots
       WHERE channel_id = $1 AND updated_at >= $2`,
      [channelId, since]
    ),
  ]);

  const [topCostRes, topProfitRes] = await Promise.all([
    db.query(
      `SELECT video_id, video_title, total_cost_usd
       FROM video_cost_snapshots
       WHERE channel_id = $1 AND updated_at >= $2
       ORDER BY total_cost_usd DESC LIMIT 5`,
      [channelId, since]
    ),
    db.query(
      `SELECT video_id, video_title, profit_usd
       FROM video_cost_snapshots
       WHERE channel_id = $1 AND updated_at >= $2 AND profit_usd IS NOT NULL
       ORDER BY profit_usd DESC LIMIT 5`,
      [channelId, since]
    ),
  ]);

  const snap = snapshotRes.rows[0];
  const byCategory: Record<string, number> = {};
  const byProvider: Record<string, number> = {};

  for (const row of eventsRes.rows) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + Number(row.total);
    byProvider[row.provider] = (byProvider[row.provider] ?? 0) + Number(row.total);
  }

  return {
    channelId,
    periodDays,
    totalCostUsd:       Number(snap.total_cost ?? 0),
    totalRevenueUsd:    Number(snap.total_revenue ?? 0),
    totalProfitUsd:     Number(snap.total_profit ?? 0),
    avgCostPerVideo:    Number(snap.avg_cost ?? 0),
    avgRevenuePerVideo: Number(snap.avg_revenue ?? 0),
    avgRoiPercent:      Number(snap.avg_roi ?? 0),
    videoCount:         Number(snap.video_count ?? 0),
    breakdownByCategory: byCategory as any,
    breakdownByProvider: byProvider as any,
    mostExpensiveVideos:  topCostRes.rows.map((r: any) => ({
      videoId: r.video_id, title: r.video_title, costUsd: Number(r.total_cost_usd),
    })),
    mostProfitableVideos: topProfitRes.rows.map((r: any) => ({
      videoId: r.video_id, title: r.video_title, profitUsd: Number(r.profit_usd),
    })),
    generatedAt: new Date().toISOString(),
  };
}
