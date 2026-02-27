# 🎬 Video Engine

**AI-powered video generation microservice** with multi-provider fallback chain.

## Features

✅ **6 video generation providers** with automatic fallback  
✅ **$0 minimum** pay-as-you-go option (Replicate)  
✅ **Smart provider chain** — starts with cheapest/free  
✅ **PostgreSQL persistence** via Prisma  
✅ **REST API** — generate, status, list jobs  
✅ **Telegram Bot integration** ready  

---

## Provider Comparison

| Provider | Minimum Top-up | Best Model | Price (5 sec) | Status |
|----------|----------------|------------|---------------|--------|
| **Replicate** | **$0** ✅ | Haiper Video 2 | **$0.25** | ✅ Recommended! |
| Runware | $5+ | Wan 2.6 Flash | $0.20 | ⚠️ Requires balance |
| AIMLAPI | $20+ | Runway Gen4 Turbo | ~$0.30 | ⚠️ 50k credits |
| Fal.ai | — | — | — | ❌ Free tier removed |
| Kie.ai | $20+ | Veo 3 | $0.80/8sec | ⚠️ Requires balance |
| Mock | $0 | — | $0 | ✅ Testing only |

### Why Replicate?

- **No minimum deposit** — pay only for what you use
- **Transparent billing** — charged per second of video
- **Multiple models** — Haiper v2 ($0.25), Kling v1.6 Pro ($0.49), Veo 2 ($2.50)
- **Reliable API** — built on top of Replicate's infrastructure

---

## Quick Start

### 1. Get API Keys

**Replicate (recommended):**
1. Sign up at [replicate.com](https://replicate.com)
2. Get token: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
3. Add credit card (charged only for usage)

**Other providers (optional):**
- Runware: [my.runware.ai/wallet](https://my.runware.ai/wallet) — $10 free credits
- AIMLAPI: [aimlapi.com/app/billing](https://aimlapi.com/app/billing) — 50k credits
- Kie.ai: [kie.ai/dashboard](https://kie.ai/dashboard) — requires $20+ top-up

### 2. Configure Environment

```bash
# In root .env
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxx

# Optional fallbacks
RUNWARE_API_KEY=
AIMLAPI_API_KEY=
KIEAI_API_KEY=
```

### 3. Start Service

```bash
cd ~/ai-pipeline

# Build and start
docker compose up -d video-engine

# Check logs
docker logs video-engine --tail 20
```

**Expected output:**
```
✅ Replicate provider loaded (pay-as-you-go, $0 minimum, Haiper v2 = $0.25/5sec)
✅ Runware provider loaded ($10 FREE credits, requires $5+ top-up for video)
✅ AIMLAPI provider loaded (50k FREE credits)
✅ Mock provider loaded (always available)
📦 Total providers loaded: 6
📊 Provider chain: Replicate(paid) → Runware(free) → AIMLAPI(free) → KieAI(paid) → Mock(free)
```

---

## API Reference

### Generate Video

```bash
POST http://localhost:3011/api/videos/generate
Content-Type: application/json

{
  "prompt": "AI robot creating YouTube videos in futuristic neon studio",
  "model": "haiper/haiper-video-2",  # or "haiper-v2"
  "duration": 5,
  "aspectRatio": "16:9"
}
```

**Response:**
```json
{
  "jobId": "prediction_abc123",
  "providerJobId": "prediction_abc123",
  "status": "queued",
  "provider": "Replicate",
  "tier": "paid",
  "estimatedTime": 90,
  "costUsd": 0.25
}
```

### Check Status

```bash
GET http://localhost:3011/api/videos/status/:jobId
```

**Response (completed):**
```json
{
  "jobId": "prediction_abc123",
  "status": "completed",
  "videoUrl": "https://replicate.delivery/pbxt/...",
  "provider": "Replicate",
  "costUsd": 0.25
}
```

### List Jobs

```bash
GET http://localhost:3011/api/videos/jobs?userId=user123&limit=10
```

---

## Supported Models

### Replicate

| Short Key | Full Model Path | Price/sec | Best For |
|-----------|----------------|-----------|----------|
| `haiper-v2` | `haiper/haiper-video-2` | $0.05 | **Testing, cheap bulk** |
| `kling-v1.6-pro` | `kuaishou/kling-v1-6-pro` | $0.098 | **Quality balance** |
| `veo-2` | `google-deepmind/veo-2` | $0.50 | **Max quality** |

### Runware

| Short Key | Full Model ID | Price/sec |
|-----------|---------------|----------|
| `wan-2.6-flash` | `alibaba:wan-2.6-flash` | $0.04 |
| `kling-v2-5-standard` | `klingai:kling-v2-5-standard` | $0.07 |
| `veo-3-fast` | `google:veo-3-fast` | $0.25 |

---

## Fallback Chain Logic

The service tries providers in order:

1. **Replicate** — if `REPLICATE_API_TOKEN` set  
   ↓ (on error or rate limit)
2. **Runware** — if `RUNWARE_API_KEY` set  
   ↓ (on insufficient credits)
3. **AIMLAPI** — if `AIMLAPI_API_KEY` set  
   ↓ (on error)
4. **Fal.ai** — if `FALAI_API_KEY` set  
   ↓ (usually fails — free tier removed)
5. **Kie.ai** — if `KIEAI_API_KEY` set  
   ↓ (on error)
6. **Mock** — always works (testing only)

---

## Cost Examples

### Replicate (pay-as-you-go)

| Videos | Duration | Model | Total Cost |
|--------|----------|-------|------------|
| 10 | 5 sec | Haiper v2 | **$2.50** |
| 20 | 5 sec | Haiper v2 | **$5.00** |
| 100 | 5 sec | Haiper v2 | **$25.00** |
| 10 | 5 sec | Kling v1.6 Pro | $4.90 |

**No minimum top-up** — start with $2.50 for 10 videos!

### Runware (free $10 credits)

| Videos | Duration | Model | Cost with Credits |
|--------|----------|-------|-------------------|
| 50 | 5 sec | Wan 2.6 Flash | **$0** (uses $10 free) |
| 100 | 5 sec | Wan 2.6 Flash | $10 (50 free + $10 paid) |

**Caveat:** Requires $5+ balance top-up before video generation works.

---

## Development

### Local Setup

```bash
cd core/video-engine

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:push

# Start dev server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/videoengine

# Providers (at least one required)
REPLICATE_API_TOKEN=r8_xxxxx
RUNWARE_API_KEY=xxxxx
AIMLAPI_API_KEY=xxxxx
KIEAI_API_KEY=xxxxx

# Server
PORT=3011
NODE_ENV=development
```

### Database Schema

```prisma
model VideoJob {
  id            String   @id @default(cuid())
  prompt        String
  model         String?
  duration      Int      @default(10)
  aspectRatio   String   @default("16:9")
  
  status        String   @default("queued")
  videoUrl      String?
  thumbnailUrl  String?
  
  provider      String?
  providerJobId String?
  costUsd       Float    @default(0)
  
  userId        String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## Troubleshooting

### "All providers failed or exhausted"

**Cause:** No valid API keys configured, or all providers hit rate limits.

**Solution:**
1. Add at least one provider API key to `.env`
2. Restart: `docker compose restart video-engine`
3. Check logs: `docker logs video-engine`

### "RUNWARE_LIMIT_EXCEEDED"

**Cause:** Runware requires $5+ balance for video inference.

**Solution:**
1. Go to [my.runware.ai/wallet](https://my.runware.ai/wallet)
2. Add credit card and top-up $5+
3. Retry generation

### "Replicate authentication failed"

**Cause:** Invalid or missing `REPLICATE_API_TOKEN`.

**Solution:**
1. Get new token: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
2. Update `.env`: `REPLICATE_API_TOKEN=r8_xxxxx`
3. Restart service

---

## Production Checklist

- [ ] Set `REPLICATE_API_TOKEN` (primary provider)
- [ ] Configure PostgreSQL persistent volume
- [ ] Set up monitoring (e.g., Prometheus + Grafana)
- [ ] Enable webhook callbacks for async notifications
- [ ] Set rate limiting on API Gateway
- [ ] Configure CDN for video delivery (Cloudflare R2, AWS S3)
- [ ] Set up cost alerts (Replicate dashboard)

---

## Links

- **Repository:** [github.com/Serguei75/ai-pipeline](https://github.com/Serguei75/ai-pipeline)
- **Replicate Docs:** [replicate.com/docs](https://replicate.com/docs)
- **Runware Docs:** [runware.ai/docs](https://runware.ai/docs)
- **Main Project README:** [../README.md](../../README.md)

---

## License

MIT
