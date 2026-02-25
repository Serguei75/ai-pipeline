# 📡 Event Bus — Справочник событий

Redis Stream: `ai-pipeline:events`

## Публикация

| Событие | Источник | Консюмеры |
|---|---|---|
| `topic.approved` | topic-engine | script-engine |
| `topic.pending_approval` | topic-engine | telegram-bot |
| `script.approved` | script-engine | voice-engine, thumbnail-engine |
| `script.pending_approval` | script-engine | telegram-bot |
| `script.hook_flagged` | script-engine | hook-tester |
| `voice.generated` | voice-engine | media-engine |
| `media.ready` | media-engine | localization-engine, thumbnail-engine |
| `analytics.hook_weak` | analytics-engine | script-engine, hook-tester, telegram-bot |
| `analytics.niche_underperforming` | analytics-engine | topic-engine, telegram-bot |
| `community.topic_exported` | community-engine | topic-engine, telegram-bot |
| `localization.completed` | localization-engine | telegram-bot |
| `hook_tester.winner_selected` | hook-tester | script-engine, telegram-bot |
| `thumbnail.generated` | thumbnail-engine | analytics-engine, telegram-bot |
| `thumbnail.failed` | thumbnail-engine | telegram-bot |

## Формат payload

```json
{
  "type": "thumbnail.generated",
  "payload": {
    "jobId": "clz123",
    "videoId": "abc",
    "imageUrl": "http://localhost:3009/static/clz123.png",
    "provider": "HUGGINGFACE",
    "model": "black-forest-labs/FLUX.1-schnell",
    "durationMs": 4521,
    "costUsd": 0
  },
  "timestamp": "2026-02-25T18:00:00.000Z",
  "source": "thumbnail-engine"
}
```

## RedisInsight GUI

Визуальный браузер Redis Streams:
`http://localhost:5540`
