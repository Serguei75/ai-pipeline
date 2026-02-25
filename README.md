# 🤖 AI YouTube Pipeline

Полностью автоматизированный пайплайн для создания YouTube-контента: от темы до готового видео с обложкой и локализацией.

## 📊 Архитектура

```
Admin UI :3000  │  Telegram Bot
        ↓↓↓↓↓↓↓↓
API Gateway :3100
        ┃
┏━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━┓
┃                   ┃                   ┃
Topic :3001       Script :3002      Voice :3003
Media :3004    Analytics :3005  Community :3006
Locale :3007   HookTest :3008  Thumbnail :3009
        ┃
Event Bus (Redis :6379)
```

## 📦 Модули

| # | Модуль | Порт | Описание |
|---|---|---|---|
| 1 | Topic Engine | 3001 | GPT-4o генерация тем |
| 2 | Script Engine | 3002 | Скрипты + 3 варианта хука |
| 3 | Voice Engine | 3003 | ElevenLabs TTS |
| 4 | Media Engine | 3004 | Сборка видео |
| 5 | Analytics Engine | 3005 | YouTube API + retention |
| 6 | Admin UI | 3000 | Next.js, i18n RU/EN |
| 7 | Community Engine | 3006 | Комментарии + AI-ответы |
| 8 | Localization Engine | 3007 | Субтитры + дубляж |
| 9 | API Gateway | 3100 | Единая точка входа |
| 10 | Hook Tester | 3008 | A/B тест хуков |
| 11 | **Thumbnail Engine** | **3009** | **Multi-provider обложки** |
| 12 | Event Bus (Redis) | 6379 | Async-сообщения между модулями |
| 13 | Telegram Bot | — | Одобрения + push-уведомления |

## 🚀 Быстрый старт

```bash
# 1. Общая Docker-сеть
docker network create ai-pipeline-network

# 2. Redis Event Bus
cd shared/events && docker compose up -d

# 3. Любой модуль
cd core/thumbnail-engine
cp .env.example .env && nano .env
docker compose up -d
```

## 📖 Документация

- [docs/architecture.md](docs/architecture.md) — Архитектура + Mermaid-диаграммы
- [docs/api-reference.md](docs/api-reference.md) — API Reference (все эндпоинты)
- [docs/events.md](docs/events.md) — Event Bus справочник событий
- [docs/providers.md](docs/providers.md) — AI провайдеры и цены
- [docs/deployment.md](docs/deployment.md) — Инструкция по деплойменту
- [docs/changelog.md](docs/changelog.md) — История версий

## 💬 Быстрый тест

```bash
# Статус системы
curl http://localhost:3100/health/all

# Генерация обложки
curl -X POST http://localhost:3100/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "AI YouTube pipeline, tech thumbnail 2026"}'

# Генерация темы
curl -X POST http://localhost:3100/topics/generate \
  -H "Content-Type: application/json" \
  -d '{"niche": "artificial-intelligence", "count": 5}'
```

## 🛠️ Технологический стек

`Node.js 20` + `Fastify 4` + `TypeScript` + `Prisma 5` + `Redis 7 Streams` + `Next.js 14` + `Docker`

**AI**: OpenAI GPT-4o · ElevenLabs · HuggingFace FLUX · FAL.AI Flux 2 · Cloudflare Workers AI
