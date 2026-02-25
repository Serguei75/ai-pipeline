# 🌐 Module 8: Localization Engine

Two-stage localization pipeline for YouTube multi-language expansion.

## Port: `3007`

## Architecture: Two-Stage Strategy

```
Stage 1 (cheap test)              Stage 2 (scale-up)
────────────────────              ──────────────────
Subtitles (.srt)                  ElevenLabs TTS
Localized metadata                Dubbed .mp3 audio
(title, description, tags)        Multi-audio package
Test RPM / retention by country   Upload to YouTube
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Stats by status/mode |
| POST | `/tasks` | Create localization task |
| GET | `/tasks` | List tasks (filters: status, page) |
| GET | `/tasks/:id` | Get task with all assets |
| POST | `/tasks/:id/process` | Start Stage 1 or 2 (body: `{"stage": 1}`) |
| GET | `/tasks/:id/package` | Get all output files |

## Quick Start

```bash
docker-compose up -d

# Or local:
npm install
cp .env.example .env
# Fill in OPENAI_API_KEY, ELEVENLABS_API_KEY
npm run prisma:migrate
npm run dev
```

## Stage 1 Flow (Subtitles + Metadata)

```bash
# Create task
curl -X POST http://localhost:3007/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "youtubeVideoId": "dQw4w9WgXcQ",
    "title": "How to Invest in ETFs",
    "targetLangs": ["de", "es", "ja"],
    "mode": "SUBTITLES",
    "scriptText": "Today we explore index fund investing...",
    "durationSeconds": 600
  }'

# Start Stage 1
curl -X POST http://localhost:3007/tasks/{id}/process \
  -H 'Content-Type: application/json' \
  -d '{"stage": 1}'

# Get package (subtitles + metadata)
curl http://localhost:3007/tasks/{id}/package
```

## Stage 2 Flow (Dubbing)

```bash
# If Stage 1 showed good RPM/retention → start Stage 2
curl -X POST http://localhost:3007/tasks/{id}/process \
  -H 'Content-Type: application/json' \
  -d '{"stage": 2}'

# Download .mp3 files and upload to YouTube as multi-audio tracks
```

## Supported Languages

| Code | Language | ElevenLabs Voice Env |
|------|----------|-----------------------|
| `de` | Deutsch | `ELEVENLABS_VOICE_DE` |
| `es` | Español | `ELEVENLABS_VOICE_ES` |
| `ja` | Japanese | `ELEVENLABS_VOICE_JA` |
| `fr` | Français | `ELEVENLABS_VOICE_FR` |
| `pt` | Português | `ELEVENLABS_VOICE_PT` |
| `ru` | Russian | `ELEVENLABS_VOICE_RU` |

## Environment Variables

See `.env.example`. Required:
- `OPENAI_API_KEY` — translation + metadata generation
- `ELEVENLABS_API_KEY` — TTS dubbing (Stage 2 only)
- `DATABASE_URL` — PostgreSQL

## Docker port allocation

| Service | Port (host) | Port (container) |
|---------|-------------|------------------|
| localization-engine | 3007 | 3007 |
| postgres-localization | 5438 | 5432 |
