# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - Video Engine Multi-Provider Support (2026-02-27)

#### 🎬 Video Generation Providers
- **Replicate provider** — $0 minimum, pay-as-you-go ($0.25/5sec with Haiper v2)
- **Runware provider** — $10 free credits, supports Wan 2.6 Flash, Kling v2.5, Veo 3
- **AIMLAPI provider** — 50k free credits (requires card verification)
- **Fal.ai provider** — legacy support (free tier removed Dec 2025)
- **Kie.ai provider** — supports Veo 3, requires balance top-up
- **Mock provider** — instant testing without API calls

#### 🔄 Smart Fallback Chain
- Automatic provider failover on rate limits or errors
- Priority-based chain: Replicate → Runware → AIMLAPI → Fal.ai → Kie.ai → Mock
- Graceful degradation — Mock provider always works as final fallback

#### 📊 Cost Optimization
- Replicate: **No minimum deposit** — start with $2.50 for 10 videos
- Runware: $10 free credits — ~50 videos at $0.20/5sec
- Total savings: **~$20** compared to traditional $20+ minimum top-ups

#### 🛠️ Developer Experience
- Comprehensive `core/video-engine/README.md` with:
  - Provider comparison table
  - API reference
  - Cost examples
  - Troubleshooting guide
  - Production checklist
- Updated `.env.example` with all video provider keys
- Added `replicate` npm dependency to `package.json`

#### 🔧 Technical Implementation
- `replicate.provider.ts` — Replicate API integration with model resolver
- `runware.provider.ts` — Fixed endpoint (unified `/v1` with `taskType`)
- `aimlapi.provider.ts` — Runway Gen4 Turbo support
- `fal.provider.ts` — Wan 2.6, Veo 3 support
- `kieai-veo.provider.ts` — Veo 3.1 API integration
- `mock.provider.ts` — Instant fake video for testing
- `video.service.ts` — Provider chain orchestration with tier tracking

#### 💾 Database
- PostgreSQL via Prisma ORM
- `VideoJob` model with:
  - `provider` field — tracks which provider generated video
  - `providerJobId` — upstream task ID for status polling
  - `costUsd` — estimated cost per job
  - `status` — queued | processing | completed | failed

#### 🚀 API Endpoints
- `POST /api/videos/generate` — start video generation
- `GET /api/videos/status/:jobId` — poll job status
- `GET /api/videos/jobs` — list user jobs
- `GET /api/videos/health` — service health check

#### 📝 Documentation
- Provider pricing comparison: Replicate ($0.25) vs Runware ($0.20) vs Kie.ai ($0.80)
- Model reference: Haiper v2, Kling v1.6 Pro, Veo 2, Wan 2.6 Flash
- Environment variable examples for all 6 providers

### Changed
- Video Engine now supports 6 providers (was: 0)
- Provider chain logic: automatic fallback on errors
- Cost tracking: `costUsd` field added to VideoJob model

### Fixed
- Runware API endpoint corrected: `/v1` with `taskType: "videoInference"`
- Runware status polling: `getResponse` taskType for async results
- Provider model resolution: supports both short keys (`haiper-v2`) and full paths (`haiper/haiper-video-2`)

---

## Commit History

### Video Engine Implementation

- **d5eafc6d** - docs: comprehensive README for Video Engine with all providers (2026-02-27)
- **eed9517e** - docs: add video generation providers to .env.example (2026-02-27)
- **3a2c59da** - feat: add replicate SDK dependency (2026-02-27)
- **55840801** - feat: add Replicate provider — $0 minimum, pay-as-you-go video generation (2026-02-27)
- **91e05161** - fix: Runware provider — correct API endpoint, payload structure and all models from docs (2026-02-27)

---

## Migration Guide

### From Mock-only to Multi-Provider

If you were using only Mock provider before:

1. **Add Replicate API token** (recommended):
   ```bash
   # In .env
   REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxx
   ```

2. **Rebuild video-engine**:
   ```bash
   docker compose build video-engine
   docker compose up -d video-engine
   ```

3. **Test with real generation**:
   ```bash
   curl -X POST http://localhost:3011/api/videos/generate \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "AI robot in futuristic studio",
       "model": "haiper-v2",
       "duration": 5
     }'
   ```

4. **Cost**: $0.25 per 5-second video (Haiper v2)

---

## Roadmap

### Upcoming Features

- [ ] **Video2Video** — style transfer, upscaling
- [ ] **Image2Video** — animate static images
- [ ] **Webhook callbacks** — notify on completion
- [ ] **Batch generation** — queue multiple prompts
- [ ] **Cost analytics dashboard** — track spending per provider
- [ ] **SiliconFlow provider** — $0.21/video (cheapest option)
- [ ] **ModelsLab provider** — $0.16/video (Seedance Pro Fast)

### Provider Wishlist

- [ ] **Luma AI** — Dream Machine (high quality)
- [ ] **Pika Labs** — creative animations
- [ ] **Stability AI** — Stable Video Diffusion
- [ ] **OpenAI** — Sora (when API available)

---

## Credits

- **Replicate** — [replicate.com](https://replicate.com)
- **Runware** — [runware.ai](https://runware.ai)
- **AIMLAPI** — [aimlapi.com](https://aimlapi.com)
- **Kie.ai** — [kie.ai](https://kie.ai)
- **Prisma ORM** — [prisma.io](https://prisma.io)
- **Fastify** — [fastify.dev](https://fastify.dev)

---

## License

MIT License - see [LICENSE](LICENSE) file for details.
