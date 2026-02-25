# 🚦 AI Pipeline — Roadmap

## ✅ Done (v1.0)

| Module | Description |
|--------|-------------|
| Topic Engine (3001) | Trend discovery, niche CPM, hook scoring |
| Script Engine (3002) | GPT-4o scripts: SHORT + DEEP formats |
| Voice Engine (3003) | ElevenLabs TTS, 5 voices |
| Media Engine (3004) | HeyGen + Pexels + FFmpeg assembly |
| Analytics Engine (3005) | YouTube API, CPM/RPM, retention, CTV |
| Admin UI (3000) | Next.js 14, i18n RU/EN, 8 nav sections |
| Community Engine (3006) | AI comment classification + reply drafts |
| Localization Engine (3007) | 2-stage: subtitles → dubbing |

---

## 🔧 In Progress (v1.1)

### EPIC F — Analytics Feedback Loop
- [ ] F1. Hook retention data (0–8s, 0–60s) → auto-flag weak hooks in Script Engine
- [ ] F2. RPM/Tier-1 data → auto-suggest niche adjustment in Topic Engine
- [ ] F3. Community recurring questions → auto-push to Topic Engine

### EPIC G — API Gateway
- [ ] G1. Single Fastify reverse proxy on :3100
- [ ] G2. Route `/topic/*`, `/script/*`, `/voice/*` etc. to correct microservice
- [ ] G3. Unified health check endpoint: `GET /health/all`
- [ ] G4. Update Admin UI to use single `NEXT_PUBLIC_API_URL`

---

## 💡 Planned (v1.2)

### EPIC H — A/B Hook Testing
- [ ] H1. Generate 3 hook variants per script
- [ ] H2. Track retention per variant via Analytics Engine
- [ ] H3. Auto-promote best hook to Script Engine templates

### EPIC I — Telegram Bot
- [ ] I1. Bot commands: /approve_topic, /approve_script, /review_draft
- [ ] I2. Push notifications: new topic ready, script needs review
- [ ] I3. Quick stats: today’s RPM, hook score, pending items

### EPIC J — Thumbnail Generator
- [ ] J1. DALL-E 3 / Stability AI thumbnail generation
- [ ] J2. CTV-optimized: large text, high contrast, readable at distance
- [ ] J3. A/B thumbnail variants with CTR tracking

### EPIC K — Cost Tracker
- [ ] K1. Log API costs: OpenAI tokens, ElevenLabs chars, HeyGen minutes
- [ ] K2. Revenue vs cost ROI per video
- [ ] K3. Monthly cost breakdown in Admin UI

### EPIC L — Competitor Intelligence
- [ ] L1. Monitor competitor channels via YouTube API
- [ ] L2. Extract trending topics and hook patterns
- [ ] L3. Auto-push competitive topics to Topic Engine

### EPIC M — Event Bus (Redis Streams)
- [ ] M1. Replace direct HTTP calls with async events
- [ ] M2. Topic approved → event → Script Engine starts
- [ ] M3. Script approved → event → Voice + Media start in parallel

---

## 🚀 Future (v2.0)

- **Multi-tenant SaaS** — each user has isolated channels + pipeline
- **Cross-posting Engine** — repurpose YouTube → TikTok/Reels/X Clips
- **SEO Optimizer** — TubeBuddy/VidIQ-style metadata scoring
- **Content Calendar** — visual scheduling, deadline tracking
- **Kubernetes deployment** — Helm charts, HPA autoscaling
- **AI Quality Gate** — pre-publish auto-score: hook, CTV-readiness, retention forecast
