# 🚀 Деплоймент

## Быстрый запуск отдельного модуля

```bash
# Thumbnail Engine
cd core/thumbnail-engine
cp .env.example .env
# Добавь ключи API в .env
docker compose up -d

# Telegram Bot
cd core/telegram-bot
cp .env.example .env
# TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_IDS
docker compose up -d
```

## Запуск всей системы

```bash
# 1. Создай общую сеть Docker
docker network create ai-pipeline-network

# 2. Redis Event Bus
cd shared/events && docker compose up -d

# 3. Запуск модулей
for dir in topic-engine script-engine voice-engine media-engine analytics-engine community-engine localization-engine hook-tester thumbnail-engine api-gateway; do
  cd core/$dir && cp .env.example .env && docker compose up -d && cd ../..
done

# 4. Admin UI
cd apps/admin-ui && docker compose up -d

# 5. Telegram Bot
cd core/telegram-bot && docker compose up -d
```

## Порядок запуска сервисов

1. Redis (Event Bus) — первым, все остальные от него зависят
2. Базы данных (автоматически через `prisma migrate deploy`)
3. Модули (topic, script, voice, media, analytics, community, localization, hook-tester, thumbnail)
4. API Gateway — после всех модулей
5. Admin UI + Telegram Bot

## Проверка статуса

```bash
curl http://localhost:3100/health/all
```

```json
{
  "status": "ok",
  "services": {
    "topic-engine":        { "status": "ok", "latencyMs": 12 },
    "script-engine":       { "status": "ok", "latencyMs": 8  },
    "thumbnail-engine":    { "status": "ok", "latencyMs": 15 }
  }
}
```
