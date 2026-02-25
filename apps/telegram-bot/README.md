# 🤖 AI Pipeline — Telegram Bot

Manage your AI YouTube Pipeline directly from Telegram.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Show help |
| `/topics` | List topics pending approval |
| `/scripts` | List scripts pending review |
| `/stats` | Pipeline overview (views, revenue, RPM) |
| `/health` | Status of all services |

## Push Notifications

The bot automatically sends alerts when:
- 🎯 Topic is approved → Script Engine started
- 📝 Script approved → Media Engine started  
- ⚠️ Weak hook detected (retention@8sec < 40%)
- 📉 Niche underperforming vs CPM benchmark
- 🌍 Localization completed
- 💬 New topic extracted from comments

## Setup

```bash
# 1. Create bot via @BotFather, get token
# 2. Get your user ID from @userinfobot
# 3. Configure .env
cp .env.example .env

# 4. Run
npm install
npm run dev

# Or with Docker
docker-compose up -d
```

## Architecture

```
Telegram App
    ↓ commands / callbacks
Telegram Bot (Grammy)
    ↓ REST calls
API Gateway :3100
    ↓ routes to
All Modules (3001–3008)

Redis :6379 (Event Bus)
    → push notifications → Telegram
```
