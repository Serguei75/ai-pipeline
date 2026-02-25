-- Cost Tracker schema
-- Run once to initialise the cost tracking tables

CREATE TABLE IF NOT EXISTS cost_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  category      TEXT NOT NULL,
  provider      TEXT NOT NULL,
  units         NUMERIC(18,6) NOT NULL,
  unit_label    TEXT NOT NULL,
  cost_usd      NUMERIC(12,8) NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_events_video_id   ON cost_events(video_id);
CREATE INDEX IF NOT EXISTS idx_cost_events_channel_id ON cost_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_cost_events_created_at ON cost_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_events_provider   ON cost_events(provider);

CREATE TABLE IF NOT EXISTS video_cost_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        TEXT UNIQUE NOT NULL,
  video_title     TEXT NOT NULL,
  channel_id      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  total_cost_usd  NUMERIC(12,8) NOT NULL DEFAULT 0,
  revenue_usd     NUMERIC(12,8),
  roi_percent     NUMERIC(8,4),
  profit_usd      NUMERIC(12,8),
  cost_per_view   NUMERIC(12,8),
  views           BIGINT DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_cost_snapshots_channel ON video_cost_snapshots(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_cost_snapshots_status  ON video_cost_snapshots(status);
