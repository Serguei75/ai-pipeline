# 🔍 Competitor Intelligence — Module 11

Мониторинг YouTube-каналов конкурентов + AI-анализ + генерация идей для Topic Engine.

## 📡 Порт
**3011**

## 🔄 Поток работы

```
1. Добавить канал  →  POST /competitors/channels
2. Авто синхронизация  →  каждые 6ч (cron)
3. Анализ трендов  →  POST /competitors/trends/analyze
4. Идеи  →  GET /competitors/ideas
5. Экспорт  →  POST /competitors/ideas/:id/export
         →  competitor.idea_exported → Event Bus → Topic Engine
```

## 📋 API Эндпоинты

### Каналы
| Метод | URL | Описание |
|---|---|---|
| GET | `/competitors/channels` | Список всех каналов |
| GET | `/competitors/channels/:id` | Детали + топ-10 видео |
| POST | `/competitors/channels` | Добавить канал |
| PATCH | `/competitors/channels/:id` | Обновить (niche, isActive) |
| DELETE | `/competitors/channels/:id` | Удалить канал |
| POST | `/competitors/channels/:id/sync` | Ручная синхронизация |
| POST | `/competitors/channels/sync-all` | Синх всех каналов |

### Видео
| Метод | URL | Описание |
|---|---|---|
| GET | `/competitors/videos?trending=true` | Трендовые видео |
| GET | `/competitors/videos?channelId=` | Фильтр по каналу |
| GET | `/competitors/videos/:videoId` | Детали + идеи |

### Тренды
| Метод | URL | Описание |
|---|---|---|
| GET | `/competitors/trends?days=7` | Топ трендов сгруппированных по нишам |
| POST | `/competitors/trends/analyze` | AI-анализ + генерация идей |

### Идеи
| Метод | URL | Описание |
|---|---|---|
| GET | `/competitors/ideas?status=PENDING` | Список идей |
| POST | `/competitors/ideas/:id/export` | Экспорт в Topic Engine |
| DELETE | `/competitors/ideas/:id` | Отклонить |
| POST | `/competitors/ideas/:id/restore` | Вернуть в PENDING |

## 📡 Event Bus

| Событие | Когда |
|---|---|
| `competitor.trend_detected` | Видео > minViewVelocity views/day |
| `competitor.ideas_bulk_generated` | AI сгенерировал идеи |
| `competitor.idea_exported` | Идея экспортирована в Topic Engine |

## Быстрый тест

```bash
# Добавить канал
curl -X POST http://localhost:3011/competitors/channels \
  -H 'Content-Type: application/json' \
  -d '{"channelUrl": "@MrBeast", "niche": "entertainment"}'

# Тренды за 7 дней
curl http://localhost:3011/competitors/trends?days=7

# AI-анализ канала
curl -X POST http://localhost:3011/competitors/trends/analyze \
  -H 'Content-Type: application/json' \
  -d '{"channelId": "<channel-db-id>"}'

# Посмотреть идеи
curl http://localhost:3011/competitors/ideas?status=PENDING

# Экспорт в Topic Engine
curl -X POST http://localhost:3011/competitors/ideas/<id>/export
```

## Установка

```bash
cd core/competitor-intelligence
cp .env.example .env
npm install
npm run db:push
npm run dev
```
