# 🧪 Module 9: Hook Tester

A/B test 3 hook variants per script using 5 psychological triggers. Tracks `retention_8s` from Analytics Engine. Promotes winners to template library.

## Port: `3008`

## How It Works

```
1. Script approved
        ↓
2. Hook Tester generates 3 variants:
   ├─ Variant A: FEAR     "You're losing $500/month by not doing this..."
   ├─ Variant B: CURIOSITY "Nobody talks about this investing trick..."
   └─ Variant C: DESIRE   "Here's how I grew $1k to $50k in 18 months..."
        ↓
3. All 3 scripts published, Analytics tracks retention_8s
        ↓
4. After 500+ views: winner determined by score formula
   score = retention_8s×0.5 + retention_60s×0.3 + ctr×0.2
        ↓
5. Winner promoted to Hook Template Library
   → Script Engine uses winning hooks for similar topics
```

## Psychological Triggers

| Trigger | Example | Best for |
|---------|---------|----------|
| `FEAR` | "You're making a $10k mistake right now..." | FUEL Shorts |
| `CURIOSITY` | "Nobody talks about this loophole..." | Both |
| `SURPRISE` | "I can't believe this actually worked..." | FUEL Shorts |
| `DESIRE` | "Here's the exact system to earn $X/month..." | Intellectual |
| `SOCIAL_PROOF` | "The top 1% all do this one thing..." | Intellectual |

Default triggers:
- **FUEL** (Shorts): FEAR + SURPRISE + CURIOSITY
- **INTELLECTUAL** (Essays): CURIOSITY + DESIRE + SOCIAL_PROOF

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Overall stats |
| POST | `/tests` | Create test + generate 3 variants |
| GET | `/tests` | List tests (filter: status) |
| GET | `/tests/:id` | Get test with variants |
| PUT | `/tests/:id/variants/:variantId/performance` | Update analytics data |
| POST | `/tests/:id/conclude` | Manually conclude test |
| GET | `/templates` | Winner library (filter: channelType, niche) |

## Quick Start

```bash
docker-compose up -d
npm install && cp .env.example .env
npm run prisma:migrate && npm run dev

# Create a test:
curl -X POST http://localhost:3008/tests \
  -H 'Content-Type: application/json' \
  -d '{
    "scriptId": "abc123",
    "topicTitle": "How to Invest $1000 in ETFs",
    "channelType": "INTELLECTUAL",
    "niche": "finance"
  }'

# Get template library:
curl "http://localhost:3008/templates?channelType=INTELLECTUAL&niche=finance"
```

## Score Formula

```
score = retention_8s × 0.5
      + retention_60s × 0.3
      + ctr           × 0.2
```

`retention_8s` has the highest weight as the most critical metric for CTV + algorithm.
