# 🤖 AI Pipeline — YouTube Content Automation System

> Full-stack AI pipeline for creating, localizing, publishing and analyzing YouTube content.
> 8 microservices + Admin UI. Each service has its own Docker Compose.

[![Node.js](https://img.shields.io/badge/Node.js-20-green)]
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]
[![Fastify](https://img.shields.io/badge/Fastify-4-black)]
[![Next.js](https://img.shields.io/badge/Next.js-14-white)]
[![Prisma](https://img.shields.io/badge/Prisma-5-purple)]

---

## 📊 Architecture

```
┌──────────────────────────────────────────────────┐
│            ADMIN UI  :3000  (Next.js 14)              │
└────────┬─────────┬────────┬─────────┬────────┘
         │        │         │         │        │
    :3001 │   :3002 │    :3003 │    :3004 │   :3005 │
  ┌──────┴┐ ┌─────┴┐ ┌──────┴┐ ┌──────┴┐ ┌─────┴┐
  │ Topic  │ │Script  │ │ Voice  │ │ Media  │ │ Anal. │
  │ Engine │ │Engine  │ │ Engine │ │ Engine │ │Engine │
  └──────┘ └─────┘ └──────┘ └──────┘ └─────┘

    :3006 Community Engine  →  AI comment manager
    :3007 Localization Engine →  subtitles + dubbing

  Data flow:
  Topics → Scripts → Voice → Media → YouTube
                                   ↓
                           Analytics ← Comments
                                   ↓
                          Localization (multi-market)
```

---

## 📦 Modules

| # | Module | Port | Description | Docker DB port |
|---|--------|------|-------------|----------------|
| 1 | **Topic Engine** | 3001 | Trend discovery, niche CPM scoring, hook ideas, market targeting | 5432 |
| 2 | **Script Engine** | 3002 | LLM script generation (SHORT/FUEL + DEEP/Intellectual), hook templates | 5433 |
| 3 | **Voice Engine** | 3003 | ElevenLabs TTS, 5 voices, multi-language audio generation | 5434 |
| 4 | **Media Engine** | 3004 | HeyGen avatars, Pexels B-roll, FFmpeg assembly, CTV/Shorts formats | 5435 |
| 5 | **Analytics Engine** | 3005 | YouTube Data/Analytics API, CPM/RPM, hook retention, ROI dashboard | 5436 |
| 6 | **Admin UI** | 3000 | Next.js 14 + shadcn/ui, TanStack Query, i18n RU/EN | — |
| 7 | **Community Engine** | 3006 | YouTube comment sync, AI classification, reply drafts, topic extraction | 5437 |
| 8 | **Localization Engine** | 3007 | Stage1: subtitles+metadata, Stage2: ElevenLabs dubbing + multi-audio | 5438 |

---

## ⚡ Quick Start

Each module runs independently with its own docker-compose:

```bash
# Clone
git clone https://github.com/Serguei75/ai-pipeline.git
cd ai-pipeline

# Start any module
cd core/topic-engine
cp .env.example .env   # fill in your API keys
docker-compose up -d

# APIs available:
# http://localhost:3001/health
# http://localhost:3001/topics
```

### Start Admin UI
```bash
cd apps/admin-ui
cp .env.example .env   # set NEXT_PUBLIC_*_URL for each service
npm install
npm run dev
# http://localhost:3000
```

### Environment variables per module

| Module | Required keys |
|--------|---------------|
| Topic Engine | `OPENAI_API_KEY`, `YOUTUBE_API_KEY` |
| Script Engine | `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) |
| Voice Engine | `ELEVENLABS_API_KEY` |
| Media Engine | `HEYGEN_API_KEY`, `PEXELS_API_KEY` |
| Analytics Engine | `YOUTUBE_API_KEY`, `YOUTUBE_REFRESH_TOKEN` |
| Community Engine | `OPENAI_API_KEY`, `YOUTUBE_API_KEY` |
| Localization Engine | `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` |

---

## 📁 Project Structure

```
ai-pipeline/
├── apps/
│   └── admin-ui/          # Next.js 14 Admin Dashboard
├── core/
│   ├── topic-engine/      # Module 1
│   ├── script-engine/     # Module 2
│   ├── voice-engine/      # Module 3
│   ├── media-engine/      # Module 4
│   ├── analytics-engine/  # Module 5
│   ├── community-engine/  # Module 7
│   └── localization-engine/ # Module 8
├── shared/
│   ├── config/markets.ts  # Tier-1 CPM data (NO=$43, AU=$36, US=$32...)
│   └── types/index.ts     # Shared TypeScript types
├── docs/
│   └── ARCHITECTURE.md    # Full architecture diagram
├── docker-compose.yml   # Root compose (all services)
└── package.json         # Workspace config
```

---

## 🎥 Channel Strategy

Two channel types are built into the pipeline:

| Type | Format | Duration | Style |
|------|--------|----------|-------|
| **FUEL** | Shorts / TikTok-style | 30–90 sec | Hook-first, AI TTS, fast cuts |
| **INTELLECTUAL** | Video essays / Deep dives | 8–15 min | Human voice, CTV-optimized, research-heavy |

Target markets (highest CPM): **NO ≈$43 → AU ≈$36 → US ≈$32 → CH ≈$23**

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 20, TypeScript 5.3 |
| API Framework | Fastify 4 |
| ORM | Prisma 5 + PostgreSQL 15 |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, TanStack Query |
| AI / LLM | OpenAI GPT-4o-mini, Anthropic Claude (optional) |
| TTS | ElevenLabs (multi-voice, multi-language) |
| Avatar | HeyGen API |
| Video | FFmpeg (assembly, subtitles, format conversion) |
| B-roll | Pexels API |
| YouTube | YouTube Data API v3 + Analytics API |
| Containers | Docker + Docker Compose (per module) |
| CI/CD | GitHub Actions |

---

## 📊 Status

- [x] Module 1: Topic Engine — production-ready
- [x] Module 2: Script Engine — production-ready
- [x] Module 3: Voice Engine — production-ready
- [x] Module 4: Media Engine — production-ready
- [x] Module 5: Analytics Engine — production-ready
- [x] Module 6: Admin UI — production-ready (i18n RU/EN)
- [x] Module 7: Community Engine — production-ready
- [x] Module 8: Localization Engine — production-ready
- [ ] API Gateway — planned
- [ ] Event Bus (Redis Streams) — planned
- [ ] Analytics → Script feedback loop — planned
- [ ] Telegram Bot — planned

---

## 💡 Contributing

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.

---

*Built with ❤️ by Serguei75*
