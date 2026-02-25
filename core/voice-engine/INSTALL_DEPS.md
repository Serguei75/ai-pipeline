# Установка зависимостей — voice-engine (Provider Pattern)

## Архитектура провайдеров

```
TtsRouter
├── KokoroProvider   (HF Kokoro-82M)    — FREE, dev/CI
├── PollyProvider    (Amazon Polly)     — $4-16/1M chars, prod standard
└── ResembleProvider (Resemble AI)     — $5-19/мес, клон голоса
```

## Зависимости по провайдеру

### Только Amazon Polly требует npm-пакет (AWS SDK v3):

```bash
cd core/voice-engine
npm install @aws-sdk/client-polly@^3.758.0
```

### Kokoro и Resemble — только нативный `fetch` (Node.js 18+), без пакетов.

---

## Переменные окружения `.env`

```env
# ──────────────────────────────────────────────────
# KokoroProvider (HuggingFace Kokoro-82M, FREE)
# ──────────────────────────────────────────────────
HF_API_TOKEN=hf_xxxxxxxxxxxx                  # opional, если нужен больший rate limit
KOKORO_MODEL=hexgrad/Kokoro-82M               # модель по умолчанию

# ──────────────────────────────────────────────────
# PollyProvider (Amazon Polly, ~$2-5/мес prod)
# Регистрация: https://aws.amazon.com/polly/
# ──────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
POLLY_ENGINE=neural                           # 'neural' ($16/1M) | 'standard' ($4/1M)
POLLY_DEFAULT_VOICE_ID=Joanna                 # Joanna, Matthew, Amy, Brian, Aria...

# ──────────────────────────────────────────────────
# ResembleProvider (Resemble AI, клон голоса)
# Регистрация: https://app.resemble.ai
# ──────────────────────────────────────────────────
RESEMBLE_API_TOKEN=xxxxxxxxxxxxxxxxx           # Settings → API Key
RESEMBLE_PROJECT_UUID=xxxxxxxx-xxxx-xxxx-xxxx  # ваш project UUID
RESEMBLE_DEFAULT_VOICE_UUID=xxxxxxxx-xxxx       # UUID голоса по умолчанию

# ──────────────────────────────────────────────────
# Общие
# ──────────────────────────────────────────────────
AUDIO_OUTPUT_DIR=./output/audio
PUBLIC_BASE_URL=https://your-domain.com
```

---

## Маршрутизация TtsRouter

| `mode` | `clone` | `quality` | Провайдер | Стоимость |
|--------|---------|-----------|----------|----------|
| `dev` | — | — | Kokoro | $0 |
| — | — | `free` | Kokoro | $0 |
| `prod` | — | — | Polly | ~$2-5/мес |
| — | — | `economy` | Polly | ~$2-5/мес |
| — | `true` | — | Resemble | $5-19/мес |
| `clone` | — | — | Resemble | $5-19/мес |

## Калькулятор стоимости (320k символов/мес)

```
Kokoro  (dev):   320 000 симв × $0     = $0.00/мес
Polly   (neural):320 000 симв × $0.016 = $5.12/мес
Polly   (std):   320 000 симв × $0.004 = $1.28/мес
Resemble Starter:                         = $5.00/мес (фикс)
Resemble Creator:                         = $19.00/мес (фикс)

Оптимально (стандарт + клон):
  Polly std  $1.28 + Resemble Starter $5 = $6.28/мес (всесто $99 ElevenLabs)
```

## NanoBot — примеры вызовов

```
# Тест хука (бесплатно)
generate_voiceover(script, mode="dev")

# Прод видео (дешево)
generate_voiceover(script, mode="prod", quality="economy")

# Бренд-голос клиента
generate_voiceover(script, clone=true, voiceId="<resemble_voice_uuid>")
```
