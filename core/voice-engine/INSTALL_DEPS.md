# voice-engine — Provider Stack (v2, no subscriptions)

## Стек провайдеров (все pay-per-use или free)

```
TtsRouter
├── KokoroProvider         HF Kokoro-82M    — FREE, dev/CI
├── GoogleCloudTtsProvider Google TTS       — 1M симв/мес бесплатно вечно, затем $16/1M
├── FishAudioProvider      Fish Audio       — $15/1M байт, pay-per-use + клонирование
└── PollyProvider          Amazon Polly     — $4/1M (фоллбэк при >1M симв/мес)
```

## Новые npm-пакеты

**Ни одного!** Google TTS и Fish Audio используют нативный `fetch` (Node.js 18+).

Polly (AWS SDK) установлен ранее и остаётся как fallback:
```bash
# Только если ещё не установлен:
npm install @aws-sdk/client-polly@^3.758.0
```

## Переменные окружения `.env`

```env
# ──────────────────────────────────────────────────
# Kokoro (HuggingFace Inference API, FREE)
# ──────────────────────────────────────────────────
HF_API_TOKEN=hf_xxxx          # Optional, for higher rate limits
KOKORO_MODEL=hexgrad/Kokoro-82M

# ──────────────────────────────────────────────────
# Google Cloud TTS (1M симв/мес FREE, затем pay-per-use)
# Регистрация: console.cloud.google.com → APIs → Cloud Text-to-Speech API
# ──────────────────────────────────────────────────
GOOGLE_TTS_API_KEY=AIzaSy...               # Проще: GCP Console → APIs → Credentials
GOOGLE_TTS_DEFAULT_VOICE_ID=en-US-Neural2-F
# Или ADC (Cloud Run / GCE): установить GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json

# ──────────────────────────────────────────────────
# Fish Audio (pay-per-use, $15/1M bytes, клон голоса)
# Регистрация: fish.audio → Settings → API Keys
# ──────────────────────────────────────────────────
FISH_AUDIO_API_KEY=xxxxxxxxxxxx
FISH_AUDIO_DEFAULT_MODEL_ID=            # UUID модели голоса (по 0 можно оставить пустым)

# ──────────────────────────────────────────────────
# Amazon Polly (fallback >1M chars, pay-per-use)
# ──────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxx
POLLY_ENGINE=standard                   # 'standard'=$4/1M | 'neural'=$16/1M
POLLY_DEFAULT_VOICE_ID=Joanna

# ──────────────────────────────────────────────────
# Общие
# ──────────────────────────────────────────────────
AUDIO_OUTPUT_DIR=./output/audio
PUBLIC_BASE_URL=https://your-domain.com
```

## Маршрутизация TtsRouter (v2)

| `mode` | `clone` | `quality` | Провайдер | Стоимость 320k/мес |
|---|---|---|---|---|
| `dev` | — | — | Kokoro | **$0** |
| — | — | `free` | Kokoro | **$0** |
| `prod` | — | — | Google TTS | **$0** (под free tier) |
| — | `true` | — | Fish Audio | **$4.80** (разово) |
| — | — | `economy` | Polly std | **$1.28** |

## Калькулятор (320k симв/мес — 10 видео неделью)

```
Сценарий A (без клонирования):
  Dev:  Kokoro      —  $0.00
  Prod: Google TTS  —  $0.00  (под 1M free tier)
  TOTAL: $0.00 / мес

Сценарий B (с клонированием бренд голоса):
  Dev:   Kokoro     —  $0.00
  Prod:  Google TTS —  $0.00
  Clone: Fish Audio —  ~$4.80  (разово за продакшн видео)
  TOTAL: $4.80 / мес

Раньше (ElevenLabs Pro): $99/мес
Економия:            95%
```
