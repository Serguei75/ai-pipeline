# 💰 Cost Tracker — Module 10

Глобальный агрегатор API-расходов всего пайплайна.

## 📡 Порт
**3010**

## Что отслеживает

| Провайдер | Модули | Валюта |
|---|---|---|
| OpenAI | Topic, Script, Hook Tester, Localization | Tokens |
| ElevenLabs | Voice Engine | Characters |
| HuggingFace | Thumbnail Engine | Free (rate limits) |
| FAL.AI | Thumbnail Engine | USD |
| Cloudflare | Thumbnail Engine | Free (neuron-units) |

## 🚀 API

```bash
# Итоги по модулю и провайдеру
GET /costs/summary

# График расходов за 30 дней
GET /costs/daily?days=30

# ROI конкретного видео
GET /costs/roi/:videoId

# Список записей с фильтрами
GET /costs?module=thumbnail-engine&provider=fal&from=2026-02-01

# Ручная запись
POST /costs/manual
```

## 🔄 Работа через Event Bus

Модуль автоматически подписывается на все события в Redis Stream `ai-pipeline:events`
и логирует затраты из payload-поля `costUsd`.

```
thumbnail.generated  →  costUsd + provider + model
voice.generated      →  costUsd + characters
script.generated     →  costUsd + inputTokens + outputTokens
localization.completed → costUsd
hook_tester.*        →  costUsd
```

## 🛠️ Установка

```bash
cd core/cost-tracker
cp .env.example .env
docker compose up -d
```
