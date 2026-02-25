# Установка зависимостей — voice-engine

## Новые пакеты

ElevenLabs использует **только нативный `fetch`** (Node.js 18+) — дополнительных npm-пакетов не нужно.

```bash
# Только если понадобится SDK (optoinal, для streaming WebSocket):
cd core/voice-engine
npm install elevenlabs@^1.50.0
```

## Новые env-переменные

Добавить в `core/voice-engine/.env`:

```env
# ElevenLabs TTS
# Получить на: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Voice ID по умолчанию (будет использован если не указан voiceId)
# Премаде голоса: Bella=EXAVITQu4vr4xnSDxMaL, Adam=pNInz6obpgDQGcFmaJgB, Rachel=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Папка для сохранения аудиофайлов
AUDIO_OUTPUT_DIR=./output/audio

# Публичный URL для ссылок на audio (подставляется в audioUrl jobа)
PUBLIC_BASE_URL=https://your-domain.com
```

## Регистрация новых роутов

В `src/server.ts` добавить:

```typescript
import ttsRoutes from './routes/tts.routes.js'

// После существующих app.use(…) вызовов:
app.use('/tts', ttsRoutes)

// Статичная раздача аудиофайлов (если не храним в S3):
import { join } from 'path'
app.use('/audio', express.static(join(process.env.AUDIO_OUTPUT_DIR ?? './output/audio')))
```

## NanoBot MCP конфигурация

В `~/.nanobot/config.json` уже есть:
```json
"voice-engine": {
  "url": "http://voice-engine:3003/mcp/",
  "_tools": ["generate_voiceover", "list_voices", "get_voice_job", "get_tts_usage"]
}
```

## Полный pipeline через NanoBot

```
NanoBot: "Сгенерируй voiceover для скрипта про AI-агентов"

→ list_voices()                          # получить список голосов
→ get_voice_preview(text, voiceId)       # аудициировать топ-3
→ generate_voiceover(script, voiceId)    # → { jobId: "uuid", status: "PENDING" }
→ get_voice_job(jobId)                   # поллинг до DONE
→ media-engine: compose_video(audioUrl)  # передаём audioUrl
```

## Тесты

```bash
# Транскрибация + генерация (end-to-end)
curl -X POST http://localhost:3003/tts/generate \
  -H 'Content-Type: application/json' \
  -d '{"scriptText": "Welcome to our AI pipeline demo. This is a test voiceover."}'

# Список голосов
curl http://localhost:3003/tts/voices

# Проверка квоты
curl http://localhost:3003/tts/usage
```
