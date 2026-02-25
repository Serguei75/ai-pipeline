# 🖼 Thumbnail Engine

AI thumbnail generation for the AI Pipeline system.

## Stack (Feb 2026)

| Provider | Price/img | Elo | Use case |
|----------|-----------|-----|----------|
| **Imagen 4 Fast** | **$0.02** ($0.01 batch) | 1,225 | Default — drafts + bulk |
| Imagen 4 Standard | $0.04 | 1,230 | Production quality |
| Imagen 4 Ultra | $0.06 | 1,240 | Final approved video |
| GPT Image 1.5 | $0.04 | **1,264** | A/B test winner variant |

> ⚠️ **DALL-E 3 and Stability AI are legacy as of 2026** and NOT used in this engine.

## Cost per video

```
Default (3 Imagen Standard + 1 GPT Image): 3×$0.04 + 1×$0.04 = $0.16
Draft mode (3 Imagen Fast):                3×$0.02           = $0.06
Batch mode (3 Imagen Fast via Batch API):  3×$0.01           = $0.03
```

## API

### `POST /thumbnails/generate`
```json
{
  "videoTitle": "Why Most People Never Get Rich",
  "hookText": "You’re one decision away from a completely different life",
  "hookEmotion": "DESIRE",
  "niche": "personal-finance",
  "targetMarket": "US",
  "channelType": "INTELLECTUAL",
  "variants": 3,
  "aspectRatios": ["16:9"],
  "draft": false
}
```

Response includes:
- `variants[]` — all generated thumbnails with storage paths
- `recommendedVariantId` — highest quality pick
- `abTestingGroups.a/b` — variant IDs for A/B test
- `totalCostUsd` — actual cost of this generation

### `POST /thumbnails/:variantId/upgrade-ultra`
Upgrade a variant to Imagen 4 Ultra after A/B winner is chosen.

### `GET /thumbnails/providers`
List all providers with current pricing.

## Flow

```
Script Engine (approved script)
    ↓ videoTitle + hookText + emotion
Thumbnail Engine
    ↓ Gemini 2.5 Flash-Lite → generate N CTV-optimised prompts
    ↓ Imagen 4 Standard × N variants
    ↓ GPT Image 1.5 × 1 A/B variant (highest Elo)
Object Storage (GCS / local dev)
    ↓
Admin UI / Telegram Bot (select winner)
    ↓
Media Engine (use winning thumbnail)
```

## Port: 3009
