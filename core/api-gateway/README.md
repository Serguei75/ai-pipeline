# 🔀 API Gateway — Module 9

Единая точка входа для всех модулей AI YouTube Pipeline.

## 📡 Порт
**3100**

## 📌 Таблица маршрутизации

| Gateway prefix | Сервис | Порт |
|---|---|---|
| `/topics/*` | topic-engine | 3001 |
| `/scripts/*` | script-engine | 3002 |
| `/voice/*` | voice-engine | 3003 |
| `/media/*` | media-engine | 3004 |
| `/analytics/*` | analytics-engine | 3005 |
| `/community/*` | community-engine | 3006 |
| `/localization/*` | localization-engine | 3007 |
| `/hooks/*` | hook-tester | 3008 |
| `/thumbnails/*` | thumbnail-engine | 3009 |
| `/costs/*` | cost-tracker | 3010 |

## 🔧 Собственные эндпоинты

```
GET  /health        — статус Gateway
GET  /health/all    — статус всех 10 сервисов с latency
GET  /registry      — полный список сервисов + URL
```

## Быстрый тест

```bash
# Статус всей системы
curl http://localhost:3100/health/all

# Карта сервисов
curl http://localhost:3100/registry

# Генерация обложки
curl -X POST http://localhost:3100/thumbnails/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"AI revolution 2026 YouTube thumbnail"}'

# Расходы за сегодня
curl http://localhost:3100/costs/summary

# A/B тест обложек
curl -X POST http://localhost:3100/thumbnails/ab-test \
  -H 'Content-Type: application/json' \
  -d '{"videoId":"vid123","basePrompt":"AI tools 2026"}'
```

## Установка

```bash
cd core/api-gateway
cp .env.example .env
docker compose up -d
```
