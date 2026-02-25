# 📡 Event Bus — Redis Streams

Shared async event bus for inter-service communication. All modules publish and subscribe via Redis Streams.

## Why Redis Streams?

- **Persistent** — messages survive restarts (unlike pub/sub)
- **Consumer Groups** — each service gets its own read position
- **Replay** — can reprocess historical events for debugging
- **Lightweight** — no broker to maintain (Redis is already a dep for caching)

## Start Redis

```bash
cd shared/events
docker-compose up -d

# Redis:        redis://localhost:6379
# RedisInsight: http://localhost:5540  (visual stream browser)
```

## Install in any module

```bash
npm install ioredis
# then import from shared package:
import { EventPublisher, EventConsumer } from '@ai-pipeline/events'
```

## Publish an event

```typescript
const publisher = new EventPublisher('topic-engine')

// When a topic is approved:
await publisher.publish('topic.approved', {
  topicId: '123',
  title: 'How to Invest in ETFs',
  channelType: 'INTELLECTUAL',
  niche: 'finance',
  targetMarkets: ['US', 'DE', 'AU'],
  estimatedCPM: 32,
  hookIdeas: ['Fear of missing out', 'I lost $50k doing this'],
})
```

## Consume events

```typescript
// Script Engine listens for approved topics—auto-starts script generation:
const consumer = new EventConsumer('script-engine-group', 'script-engine-1')

consumer.on('topic.approved', async (event) => {
  const { topicId, channelType } = event.payload
  await scriptService.generateForTopic(topicId, channelType)
})

consumer.on('analytics.hook_weak', async (event) => {
  // Flag the script for hook revision
  await scriptService.flagHook(event.payload.scriptId)
})

await consumer.start()
```

## Event Catalog

| Event | Source | Consumers |
|-------|--------|-----------|
| `topic.approved` | Topic Engine | Script Engine (auto-generate) |
| `topic.rejected` | Topic Engine | — |
| `script.approved` | Script Engine | Voice + Media (parallel start) |
| `script.hook_flagged` | Analytics | Script Engine (revision) |
| `voice.generated` | Voice Engine | Media Engine |
| `media.ready` | Media Engine | Localization (auto-start Stage 1) |
| `analytics.hook_weak` | Analytics | Script Engine |
| `analytics.niche_underperforming` | Analytics | Topic Engine (reduce niche score) |
| `community.topic_exported` | Community | Topic Engine |
| `localization.completed` | Localization | Admin UI notification |

## Stream Key

All events go to a single stream: `ai-pipeline:events`

Each service creates its own consumer group with a unique name, so they each maintain an independent read position.

## Environment Variable

Add to any module's `.env`:
```env
REDIS_URL=redis://localhost:6379
```
