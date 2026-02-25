# Установка зависимостей — competitor-intelligence

После добавления OpenClaw skills интеграции нужно установить новые npm-пакеты.

## Новые зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `@google/generative-ai` | `^0.21.0` | Gemini AI SDK для DeconstructorService |
| `youtube-transcript` | `^1.2.1` | YouTube транскрипция для TubescribeService |

## Установка

```bash
cd core/competitor-intelligence
npm install @google/generative-ai@^0.21.0 youtube-transcript@^1.2.1
```

## Новые env-переменные

Добавить в `core/competitor-intelligence/.env`:

```env
# Gemini AI — для DeconstructorService и BenchmarkerService
# Получить на: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

Или через Vertex AI (production):

```env
# Если используется Vertex AI вместо AI Studio
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Регистрация новых роутов

В `src/index.ts` добавить:

```typescript
import deconstructorRoutes from './routes/deconstructor.routes.js'

// После существующих app.use(...) вызовов:
app.use('/deconstructor', deconstructorRoutes)
```

## NanoBot MCP конфигурация

В `~/.nanobot/config.json` (или `nanobot/config.template.json`) уже прописан:

```json
"competitor-intel": {
  "url": "http://competitor-intel:3005/mcp/",
  "toolTimeout": 120
}
```

После `nanobot gateway` — NanoBot автоматически зарегистрирует все 7 инструментов:
- `scan_competitor`
- `get_trending_formats`
- `get_top_competitors`
- `get_gap_analysis`
- `deconstruct_competitor_video` ← новый P0
- `transcribe_youtube_video`     ← новый P0
- `benchmark_hooks`              ← новый P0

## Тест через CLI

```bash
# Убедиться что сервис работает
curl -X POST http://localhost:3009/deconstructor/transcribe \
  -H 'Content-Type: application/json' \
  -d '{"videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'

# Через NanoBot
nanobot agent -m "Деконструируй это видео: https://youtube.com/watch?v=ВИДЕО_ID"
```
