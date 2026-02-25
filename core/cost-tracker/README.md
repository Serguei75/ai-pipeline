# 💰 Cost Tracker

Real-time cost tracking for every video in the AI Pipeline.

## What it tracks

| Category | Provider | Unit | Price |
|----------|----------|------|-------|
| LLM input | Gemini 2.5 Flash | per 1M tokens | $0.30 |
| LLM output | Gemini 2.5 Flash | per 1M tokens | $2.50 |
| LLM input | Gemini Flash-Lite | per 1M tokens | $0.10 |
| LLM output | Gemini Flash-Lite | per 1M tokens | $0.40 |
| LLM input | DeepSeek V3.2 | per 1M tokens | $0.28 |
| LLM output | DeepSeek V3.2 | per 1M tokens | $0.42 |
| TTS | Google TTS Neural2 | per 1M chars | $0.016 |
| TTS | Fish Audio | per 1M chars | $0.012 |
| TTS | Kokoro HF | per 1M chars | **$0** |
| Avatar video | HeyGen | per minute | $0.50 |
| Thumbnail | Imagen 4 Fast | per image | $0.02 |
| Thumbnail | Imagen 4 Standard | per image | $0.04 |
| Thumbnail | GPT Image 1.5 | per image | $0.04 |
| Storage | GCS Standard | per GB/month | $0.02 |

## Architecture

```
All pipeline modules → Redis Streams (ai-pipeline:events)
                          ↓
                    Cost Tracker (consumer)
                          ↓
                    PostgreSQL (cost_events, video_cost_snapshots)
                          ↓
                    REST API :3010
                          ↓
                    Admin UI / Telegram Bot (/stats)
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/costs/video/:id` | Full cost breakdown + ROI for one video |
| GET | `/costs/channel/:id/summary?days=30` | Channel-level P&L summary |
| POST | `/costs/events` | Manual cost event (REST fallback) |
| PATCH | `/costs/video/:id/revenue` | Update revenue after YouTube data arrives |
| GET | `/costs/pricing` | Current pricing table for all providers |
| GET | `/costs/health` | Health check |

## Example video cost breakdown

```json
{
  "videoTitle": "Why Most People Never Get Rich",
  "costs": {
    "llmTotal": 0.0043,
    "ttsTotal": 0.0012,
    "mediaTotal": 0.25,
    "imageTotal": 0.16,
    "storageTotal": 0.0001,
    "total": 0.4156
  },
  "revenueUsd": 3.80,
  "roiPercent": 814.8,
  "profitUsd": 3.38,
  "costPerView": 0.000052
}
```

## Port: 3010
