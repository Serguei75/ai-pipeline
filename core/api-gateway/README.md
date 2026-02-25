# 🔀 API Gateway

Single entry point for all AI Pipeline microservices. Routes requests from Admin UI to the correct backend service.

## Port: `3100`

## Route Table

| Prefix | Forwards to | Service |
|--------|-------------|----------|
| `/topics/*` | `:3001` | Topic Engine |
| `/scripts/*` | `:3002` | Script Engine |
| `/voice/*` | `:3003` | Voice Engine |
| `/media/*` | `:3004` | Media Engine |
| `/analytics/*` | `:3005` | Analytics Engine |
| `/community/*` | `:3006` | Community Engine |
| `/localization/*` | `:3007` | Localization Engine |

## Gateway Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Gateway health |
| GET | `/health/all` | Aggregate health of ALL 7 services |
| GET | `/registry` | List all services with URLs |

## Quick Start

```bash
# Local
npm install
cp .env.example .env
npm run dev

# Docker
docker-compose up -d
```

## Usage Example

```bash
# Before gateway: 7 different URLs
curl http://localhost:3001/topics
curl http://localhost:3006/community/stats

# After gateway: single entry point
curl http://localhost:3100/topics
curl http://localhost:3100/community/stats

# Aggregate health check
curl http://localhost:3100/health/all
# Returns: { online: 7, total: 7, status: "ok", services: [...] }
```

## Admin UI Config

Set single env var in Admin UI:
```env
NEXT_PUBLIC_API_URL=http://localhost:3100
```

Instead of 7 separate `NEXT_PUBLIC_*_URL` variables.

## Architecture

```
Admin UI :3000
    ↓
API Gateway :3100  (this module)
    ├──────── Topic Engine :3001
    ├──────── Script Engine :3002
    ├──────── Voice Engine :3003
    ├──────── Media Engine :3004
    ├──────── Analytics Engine :3005
    ├──────── Community Engine :3006
    └──────── Localization Engine :3007
```
