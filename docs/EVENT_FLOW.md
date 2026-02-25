# 📡 Event Flow — AI Pipeline

All events flow through a single Redis Stream: `ai-pipeline:events`

## Complete Event Map

```
┌─────────────────┐     topic.approved      ┌────────────────┐
│  Topic Engine   ├───────────────────►│  Script Engine │
│  :3001          │                    │  :3002          │
└──────┬──────┘                    └──────┬──────┘
       ▲                                       │ script.approved
       │ community.topic_exported              ▾
       │                              ┌────────────────┐
┌─────┴─────────┐                │  Voice Engine  │
│  Community     │                │  :3003          │
│  Engine :3006  │                └──────┬──────┘
└───────────────┘                │ voice.generated
                                         ▾
┌───────────────┐                ┌────────────────┐
│  Analytics     │                │  Media Engine  │
│  Engine :3005  │                │  :3004          │
└──────┬──────┘                └──────┬──────┘
       │                                │ media.ready
       │ analytics.hook_weak            ▾
       │ analytics.niche_underperforming┌────────────────┐
       ├────────────────────────►│  Localization  │
       │                        │  Engine :3007  │
       │ analytics.hook_weak    └────────────────┘
       └────────────────► Script Engine (flag hook revision)
```

## Feedback Loop (EPIC F)

```
YouTube → Analytics Engine (sync)
              │
              ├── retention_8s < 40%  →  analytics.hook_weak
              │                              └──► Script Engine: needsHookRevision = true
              │                              └──► Hook Tester: creates new A/B test
              │
              └── actualRPM < CPM * 0.6  →  analytics.niche_underperforming
                                             └──► Topic Engine: penaltyFactor applied

Community Engine (cron every 24h)
    │
    └── question.frequency >= 3  →  community.topic_exported
                                    └──► Topic Engine: auto-creates pending topic
```

## Hook Tester Auto-Loop

```
Script Engine: script.approved
      ↓
Hook Tester: createTest(scriptId, 3 variants)
      ↓
All 3 variants published (3 videos)
      ↓
Analytics: tracks retention_8s per video
      ↓ (after 500+ views)
Hook Tester: concludeTest() → winner
      ↓
Hook Template Library: winner stored
      ↓
Script Engine: uses winning hooks in future scripts
      ↓
↻ loop
```

## Redis Stream Details

| Key | `ai-pipeline:events` |
|-----|-----|
| Max length | 50,000 messages |
| Consumer groups | One per service |
| ACK strategy | Ack after all handlers complete |
| GUI | RedisInsight: http://localhost:5540 |

## Adding Events to Existing Modules

```typescript
// 1. Install shared package
import { EventPublisher } from '@ai-pipeline/events'

// 2. In your service constructor:
this.publisher = new EventPublisher('your-service-name')

// 3. Publish:
await this.publisher.publish('topic.approved', payload)

// 4. Add REDIS_URL to .env:
// REDIS_URL=redis://localhost:6379
```
