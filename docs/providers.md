# 🎭 AI Провайдеры

## Генерация изображений (Thumbnail Engine)

### HuggingFace (Free)
- **Токен**: https://huggingface.co/settings/tokens
- **Модель**: `black-forest-labs/FLUX.1-schnell`
- **Стоимость**: $0 (rate limits: ~100 запросов/день)
- **ENV**: `HUGGINGFACE_API_KEY=hf_xxx`

### FAL.AI
- **Ключ**: https://fal.ai/dashboard/keys
- **Модели**: `fal-ai/flux/schnell` ($0.003), `fal-ai/flux/dev` ($0.025)
- **ENV**: `FAL_API_KEY=xxx:xxx`

### Cloudflare Workers AI
- **Аккаунт**: https://dash.cloudflare.com
- **Модель**: `@cf/black-forest-labs/flux-1-schnell`
- **Стоимость**: $0 (10k neuron-units/day free)
- **ENV**: `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`

## Текст / Скрипты (Script + Topic Engine)

- **OpenAI GPT-4o**: хуки, скрипты, классификация комментариев
- **OpenAI GPT-4o-mini**: Community Engine (A/B классификация)

## Голос (Voice Engine)

- **ElevenLabs**: TTS + мульти-язычный дубляж
- **Тарифы**: https://elevenlabs.io/pricing (free: 10k символов/мес)
