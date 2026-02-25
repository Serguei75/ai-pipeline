# 📝 Changelog

## v0.9.0 — 2026-02-25
### Добавлено
- **Module 9: Thumbnail Engine** (port 3009)
  - Мультипровайдер: HuggingFace (FLUX.1-schnell), FAL.AI (Flux 2), Cloudflare Workers AI, Mock
  - Prisma схема: ThumbnailJob + ThumbnailCostLog
  - Статическая раздача изображений через `/static/`
  - Events: `thumbnail.generated`, `thumbnail.failed`

## v0.8.0 — 2026-02-25
### Добавлено
- **Telegram Bot** (EPIC I)
  - grammY framework, long polling
  - Команды: `/topics`, `/scripts`, `/stats`, `/approve_*`, `/reject_*`
  - Inline-кнопки одобрения/отклонения
  - Push-уведомления через Event Bus (7 типов событий)

## v0.7.0 — 2026-02-25
### Добавлено
- **EPIC G: API Gateway** (port 3100)
  - Единая точка входа, `/health/all`, `/registry`
- **EPIC M: Event Bus** (Redis Streams)
  - EventPublisher + EventConsumer, 20+ событий
  - RedisInsight GUI :5540
- **EPIC H: Hook Tester** (port 3008)
  - 3 варианта хука (Fear/Curiosity/Surprise), Template Library
- **EPIC F: Analytics Feedback Loop**
  - `analytics.hook_weak` → Script Engine на доработку

## v0.6.0
- Module 8: Localization Engine (port 3007, Stage 1: субтитры, Stage 2: TTS-дубляж)
- Admin UI i18n RU/EN (default: RU, localStorage персистентность)

## v0.5.0
- Module 7: Community Engine (port 3006)
  - YouTube API sync, AI-классификация, Human-in-the-loop

## v0.4.0
- Modules 1–5: Topic, Script, Voice, Media, Analytics Engines
- Module 6: Admin UI (Next.js, port 3000)
- Индивидуальные docker-compose.yml на каждый модуль
