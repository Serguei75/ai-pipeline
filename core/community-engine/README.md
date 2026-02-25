# 🤖 Module 7: Community Engine

AI-powered YouTube comment manager — classifies comments, generates reply drafts, extracts topic ideas.

## Port: `3006`

## Features

- **YouTube API sync** — pulls comments from any video
- **AI classification** — GPT-4o-mini classifies: QUESTION / FEEDBACK / PRAISE / CRITICISM / SPAM / IDEA
- **Sentiment analysis** — POSITIVE / NEUTRAL / NEGATIVE
- **Reply drafts** — auto-generates replies in brand voice for QUESTION/FEEDBACK
- **Human-in-the-loop** — approve / edit / decline workflow in Admin UI
- **Topic extraction** — recurring questions → auto-suggest to Topic Engine
- **Cron scheduler** — processes pending comments every 30 min (configurable)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/comments` | List comments (filters: channelType, type, sentiment, draftStatus) |
| POST | `/sync` | Pull comments from YouTube API |
| POST | `/classify` | Process unclassified comments with AI |
| GET | `/drafts` | List reply drafts by status |
| PUT | `/drafts/:id/approve` | Approve (optionally edit) a draft |
| PUT | `/drafts/:id/decline` | Decline a draft |
| GET | `/topics` | View extracted topic suggestions |
| POST | `/topics/:id/export` | Push topic to Topic Engine |
| GET | `/stats` | Comments stats by type/sentiment |

## Quick Start

```bash
# Docker
docker-compose up -d

# Local
npm install
cp .env.example .env
# edit .env with your OPENAI_API_KEY, YOUTUBE_API_KEY
npm run prisma:migrate
npm run dev
```

## Integration Flow

```
YouTube API → /sync → Comments DB
                       ↓ (cron every 30min)
                    GPT-4o-mini classify
                       ↓
              Reply Draft (NEW status)
                       ↓
                   Admin UI review
                    ↓         ↓
               APPROVED    DECLINED
                    ↓
        Topic Engine ← recurring questions
```

## Environment Variables

See `.env.example` for full list. Required:
- `OPENAI_API_KEY` — for classification and reply generation
- `YOUTUBE_API_KEY` — for comment sync
- `DATABASE_URL` — PostgreSQL connection string
