# NanoBot — AI-оркестратор pipeline

Этот каталог содержит конфигурацию [HKUDS/nanobot](https://github.com/HKUDS/nanobot) — 
centrального AI-агента, управляющего всем pipeline.

## Быстрый старт

```bash
# Установка
pip install nanobot-ai
# или через uv (рекомендуется):
uv tool install nanobot-ai

# Инициализация (первый раз)
nanobot onboard

# Скопировать шаблон конфигурации
cp config.template.json ~/.nanobot/config.json
# Заполнить API ключи в ~/.nanobot/config.json

# Скопировать HEARTBEAT задачи
cp workspace/HEARTBEAT.md ~/.nanobot/workspace/HEARTBEAT.md

# Запустить gateway (все каналы + автономная работа)
nanobot gateway
```

## Структура каталога

```
nanobot/
├── README.md                    ← этот файл
├── config.template.json         ← шаблон конфигурации (без секретов)
└── workspace/
    └── HEARTBEAT.md             ← задачи автономного режима
```

## Конфигурация

Рабочая конфигурация хранится в `~/.nanobot/config.json` (вне репо, содержит секреты).
Шаблон без секретов: `nanobot/config.template.json`.

Ключевые секции конфигурации:
- `providers` — LLM провайдеры (OpenRouter, Anthropic, OpenAI, etc.)
- `agents.defaults.model` — модель по умолчанию
- `channels` — Telegram, Discord, Slack, Email, WhatsApp
- `tools.mcpServers` — все наши MCP-сервисы

## MCP-сервисы pipeline

NanoBot управляет всеми сервисами pipeline через Model Context Protocol:

| Сервис | MCP URL | Ключевые инструменты |
|--------|---------|----------------------|
| topic-engine | http://topic-engine:3001/mcp/ | search_trending, get_trends |
| script-engine | http://script-engine:3002/mcp/ | generate_script, improve_hook |
| voice-engine | http://voice-engine:3003/mcp/ | generate_voiceover, list_voices |
| media-engine | http://media-engine:3004/mcp/ | compose_video, add_broll |
| competitor-intel | http://competitor-intel:3005/mcp/ | deconstruct_video, benchmark |
| analytics-engine | http://analytics-engine:3006/mcp/ | get_stats, get_retention |
| hook-tester | http://hook-tester:3007/mcp/ | test_hook, benchmark_hooks |
| seo-optimizer | http://seo-optimizer:3008/mcp/ | optimize_title, get_keywords |
| scheduler | http://scheduler:3009/mcp/ | schedule_video, get_queue |

## Автономный режим (Heartbeat)

NanoBot просыпается каждые 30 минут и выполняет задачи из
`~/.nanobot/workspace/HEARTBEAT.md`. Текущие задачи:

- Мониторинг трендов AI-тематики
- Контроль качества опубликованных видео
- Алерты при аномалиях в аналитике
- Автозапуск pipeline при viral_score > 80

См. `workspace/HEARTBEAT.md` для деталей.

## Каналы коммуникации

Gateway поддерживает одновременно несколько каналов:
- **Telegram** — основной канал оператора
- **Discord** — уведомления команды
- **Email** — отчёты и алерты
- **CLI** — локальная разработка (`nanobot agent`)

## OpenClaw Skills

NanoBot использует скиллы из [openclaw/skills](https://github.com/openclaw/skills):

| Скилл | Назначение |
|-------|------------|
| meta-video-ad-deconstructor | Анализ конкурентных видео |
| tubescribe | Транскрипция YouTube видео |
| youtube-voice-summarizer-elevenlabs | Генерация voiceover через ElevenLabs |
| genvirall-skill | Предсказание виральности |
| vea | Аналитика вовлечённости |
| google-gemini-media | Multimodal анализ медиа |
| content-remix-studio | Репурпозинг под Shorts/Reels |

Полный каталог: [docs/OPENCLAW_SKILLS.md](../docs/OPENCLAW_SKILLS.md)
