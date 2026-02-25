# 🏗️ Архитектура AI YouTube Pipeline

## Общая схема

```mermaid
graph TD
    User[(👤 Пользователь)] --> AdminUI
    User --> TG[Telegram Bot]

    AdminUI[Admin UI\n:3000] --> GW[API Gateway\n:3100]
    TG --> GW

    GW --> TE[Topic Engine\n:3001]
    GW --> SE[Script Engine\n:3002]
    GW --> VE[Voice Engine\n:3003]
    GW --> ME[Media Engine\n:3004]
    GW --> AE[Analytics Engine\n:3005]
    GW --> CE[Community Engine\n:3006]
    GW --> LE[Localization Engine\n:3007]
    GW --> HT[Hook Tester\n:3008]
    GW --> TN[Thumbnail Engine\n:3009]

    TE -->|topic.approved| EB[Event Bus\nRedis Streams\n:6379]
    SE -->|script.approved| EB
    AE -->|analytics.hook_weak| EB
    CE -->|community.topic_exported| EB
    TN -->|thumbnail.generated| EB
    HT -->|hook_tester.winner_selected| EB
    LE -->|localization.completed| EB

    EB -->|topic.approved| SE
    EB -->|script.approved| VE
    EB -->|voice.generated| ME
    EB -->|media.ready| TN
    EB -->|analytics.hook_weak| SE
    EB -->|analytics.hook_weak| HT

    RI[RedisInsight\n:5540] --> EB
```

## Поток данных (Happy Path)

```
1. Пользователь выбирает нишу в Admin UI
2. Topic Engine генерирует 10 тем с GPT-4o
3. Пользователь одобряет тему (Admin UI или Telegram Bot)
4. Event Bus → topic.approved → Script Engine автозапускается
5. Script Engine генерирует 3 варианта хука (Fear/Curiosity/Surprise)
6. Hook Tester получает их для A/B теста
7. Пользователь одобряет скрипт
8. Event Bus → script.approved → Voice Engine + Thumbnail Engine
9. Voice Engine генерирует аудио через ElevenLabs
10. Thumbnail Engine генерирует обложку (HuggingFace/FAL/Cloudflare)
11. Media Engine сборка: видео + аудио + обложка
12. Analytics Engine отслеживает retention_8s
13. Если retention < 40% → analytics.hook_weak → Script Engine на доработку
```

## Карта портов

| Сервис | Порт | БД |
|---|---|---|
| Admin UI (Next.js) | 3000 | — |
| Topic Engine | 3001 | 5432 |
| Script Engine | 3002 | 5433 |
| Voice Engine | 3003 | 5434 |
| Media Engine | 3004 | 5435 |
| Analytics Engine | 3005 | 5436 |
| Community Engine | 3006 | 5437 |
| Localization Engine | 3007 | 5438 |
| Hook Tester | 3008 | — |
| Thumbnail Engine | 3009 | 5439 |
| API Gateway | 3100 | — |
| Redis (Event Bus) | 6379 | — |
| RedisInsight | 5540 | — |
| Telegram Bot | — | — |

## Технологический стек

| Слой | Технология |
|---|---|
| Backend | Node.js 20 + Fastify 4 + TypeScript |
| Frontend | Next.js 14 + Tailwind CSS |
| БД | PostgreSQL 16 (отдельная на модуль) |
| ORM | Prisma 5 |
| Event Bus | Redis 7 Streams |
| AI: Текст | OpenAI GPT-4o / GPT-4o-mini |
| AI: Голос | ElevenLabs TTS |
| AI: Картинки | HuggingFace / FAL.AI / Cloudflare Workers AI |
| Telegram | grammY |
| Контейнеры | Docker Compose |
