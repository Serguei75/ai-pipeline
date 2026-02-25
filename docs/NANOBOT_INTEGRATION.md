# NanoBot: AI-оркестратор всего pipeline

> **Дата решения:** 2026-02-25  
> **Статус:** Принято в архитектуру — заменяет роль «Telegram-бота» на «мозг pipeline»

## Что изменилось в понимании

Изначально `nanobot` рассматривался только как Telegram-интерфейс. Это ошибочное понимание.

**HKUDS/nanobot** — это ультралёгкий AI-агент-оркестратор (~4 000 строк Python) с:
- Agent Loop (LLM ↔ tool execution)
- Persistent Memory
- Sub-agents (параллельное выполнение)
- Cron / Heartbeat (автономная работа 24/7)
- **Нативной поддержкой MCP** — каждый наш сервис подключается как MCP-сервер
- 9 каналов коммуникации: Telegram, Discord, Slack, WhatsApp, Email, Feishu, DingTalk, QQ, CLI

## Архитектура: NanoBot как центральный оркестратор

```
┌──────────────────────────────────────────────────────────┐
│                   HKUDS/nanobot                          │
│              (gateway mode, Docker, 24/7)                │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Agent Loop  │  │ Sub-Agents   │  │ Cron / Heart   │  │
│  │ LLM↔Tools   │  │ (параллельно)│  │ beat (30 мин)  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐                       │
│  │  Memory     │  │  Skills      │                       │
│  │ (persist)   │  │ (OpenClaw)   │                       │
│  └─────────────┘  └──────────────┘                       │
└──────────────────────────────────────────────────────────┘
              │           MCP Protocol (HTTP)
   ┌──────────┼──────────────────────────────┐
   ↓          ↓          ↓          ↓        ↓
topic-    script-    voice-    media-   analytics-
engine    engine     engine    engine   engine
   ↓          ↓          ↓          ↓        ↓
competitor- hook-    scheduler  seo-    community-
intel       tester              optimizer manager

              ↕ Chat Channels
  Telegram · Discord · Slack · Email · WhatsApp
```

## Как NanoBot управляет pipeline

### 1. Через MCP — прямые вызовы сервисов

Каждый из наших 11 сервисов экспонирует `/mcp/` эндпоинт.
NanoBot регистрирует их инструменты автоматически при старте.

Пример вызова через NanoBot:
```
Пользователь: "Сделай видео про GPT-5, хочу сегодня в 18:00"

NanoBot → topic-engine MCP: search_trending("GPT-5")
       → competitor-intel MCP: deconstruct_competitor_videos(top_3)
       → genvirall-skill: predict_virality(topic, hooks)
       → script-engine MCP: generate_script(topic, competitor_analysis)
       → hook-tester MCP: benchmark_hook(script.hook, competitors)
       → voice-engine MCP: generate_voice(script)
       → media-engine MCP: compose_video(voice, b_roll)
       → scheduler MCP: schedule_publish(video, "18:00")
       → Telegram: "Видео готово и запланировано на 18:00 ✅"
```

### 2. Через Heartbeat — автономный режим

Гейтвей просыпается каждые 30 минут и выполняет задачи из
`nanobot/workspace/HEARTBEAT.md`. Результаты доставляются
в последний активный канал (Telegram/Slack/etc).

### 3. Через Cron — плановое расписание

```bash
# Полный autopilot цикл каждый день в 6:00
nanobot cron add --name "daily-pipeline" \
  --message "Run full pipeline: research → script → voice → media → publish" \
  --cron "0 6 * * *"

# Еженедельный аналитический отчёт
nanobot cron add --name "weekly-report" \
  --message "Generate weekly analytics and send to Telegram" \
  --cron "0 9 * * 1"
```

### 4. Через Sub-agents — параллельная обработка

```
Запрос: "Сделай 3 видео: GPT-5, DeepSeek R2, Llama 4"

NanoBot (main) → spawn sub-agent-1 → полный цикл GPT-5
              → spawn sub-agent-2 → полный цикл DeepSeek R2
              → spawn sub-agent-3 → полный цикл Llama 4
              → ждёт результаты → сводный отчёт в Telegram
```

## Добавление MCP к нашим сервисам

Каждый сервис должен добавить `/mcp/` эндпоинт:

### Python сервисы (competitor-intel, analytics-engine)

```python
# requirements.txt: добавить mcp
from mcp.server.fastapi import MCPRouter
from fastapi import FastAPI

app = FastAPI()
mcp = MCPRouter()

@mcp.tool("search_trending_topics")
async def search_trending(query: str, limit: int = 10) -> dict:
    """Ищет трендовые темы. Возвращает список с viral_score."""
    ...

app.include_router(mcp.router, prefix="/mcp")
```

### Node.js / TypeScript сервисы (script-engine, topic-engine)

```typescript
// package.json: добавить @modelcontextprotocol/sdk
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'script-engine', version: '1.0.0' });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_script',
      description: 'Генерирует скрипт для видео с учётом анализа конкурентов',
      inputSchema: { type: 'object', properties: { topic: { type: 'string' }, competitor_analysis: { type: 'object' } } }
    }
  ]
}));
```

## Docker: NanoBot как сервис в compose

Cм. `nanobot/config.template.json` для полного примера конфигурации.

```yaml
# В docker-compose.yml добавить:
nanobot-gateway:
  image: ghcr.io/hkuds/nanobot:latest
  container_name: nanobot-gateway
  volumes:
    - ./nanobot:/root/.nanobot
  environment:
    - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
  networks:
    - pipeline-network
  restart: unless-stopped
  depends_on:
    - topic-engine
    - script-engine
    - voice-engine
    - media-engine
    - competitor-intel
    - analytics-engine
    - hook-tester
    - scheduler
    - seo-optimizer
```

## Ссылки

- [HKUDS/nanobot](https://github.com/HKUDS/nanobot) — репозиторий NanoBot
- [docs/OPENCLAW_SKILLS.md](./OPENCLAW_SKILLS.md) — каталог OpenClaw скиллов
- [nanobot/config.template.json](../nanobot/config.template.json) — шаблон конфигурации
- [nanobot/workspace/HEARTBEAT.md](../nanobot/workspace/HEARTBEAT.md) — автономные задачи
