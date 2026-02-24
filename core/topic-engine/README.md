# Topic Engine API

AI-powered YouTube content topic generation and management system.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker)

### 🐳 Docker (Recommended)

```bash
# Start PostgreSQL + API
docker-compose up -d

# Check logs
docker-compose logs -f topic-engine

# Stop
docker-compose down
```

### 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Generate Prisma client
npm run prisma:generate

# 4. Push schema to database
npm run prisma:push

# 5. Start development server
npm run dev
```

Server: `http://localhost:3001`

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/topics` | List topics (with filters) |
| GET | `/api/topics/:id` | Get topic by ID |
| POST | `/api/topics` | Create new topic |
| PATCH | `/api/topics/:id` | Update topic |
| POST | `/api/topics/:id/approve` | Approve topic |
| POST | `/api/topics/:id/reject` | Reject topic |
| POST | `/api/topics/generate` | AI-generate topics |

## 🧪 API Examples

```bash
# Health check
curl http://localhost:3001/health

# Create topic
curl -X POST http://localhost:3001/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Revolution 2026",
    "niche": "TECH",
    "source": "MANUAL",
    "targetMarkets": ["US", "UK"],
    "keywords": ["AI", "technology"]
  }'

# List topics with filter
curl "http://localhost:3001/api/topics?status=PENDING&niche=TECH"

# Approve topic
curl -X POST http://localhost:3001/api/topics/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "admin"}'

# AI Generate topics
curl -X POST http://localhost:3001/api/topics/generate \
  -H "Content-Type: application/json" \
  -d '{"niche": "FINANCE", "targetMarkets": ["US", "UK"], "count": 3}'
```

## 🗄️ Query Parameters (GET /api/topics)

| Param | Type | Values |
|-------|------|--------|
| `status` | string | PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED |
| `niche` | string | TECH, FINANCE, SAAS, EDUCATION, HEALTH, CRYPTO, MARKETING |
| `source` | string | YOUTUBE_TRENDS, GOOGLE_TRENDS, REDDIT_API, TWITTER_API, MANUAL |
| `forShort` | boolean | true / false |
| `forDeep` | boolean | true / false |
| `search` | string | Search in title/description |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

## 🛠️ Development

```bash
npm run dev           # Watch mode
npm run build         # Production build
npm run prisma:studio # Open DB GUI
npm run prisma:migrate # Create migration
```

## 📦 Project Structure

```
topic-engine/
├── prisma/
│   └── schema.prisma     # DB schema
├── src/
│   ├── index.ts          # Server entry point
│   ├── types.ts          # TypeScript interfaces
│   ├── routes/
│   │   └── topics.routes.ts
│   └── services/
│       └── topic.service.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```
