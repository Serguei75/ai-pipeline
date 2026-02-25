# 🎨 Thumbnail Engine — Module 9

AI-powered multi-provider thumbnail generator for YouTube pipeline.

## 📡 Port
**3009**

## 🎭 Провайдеры

| Провайдер | Модель по умолчанию | Бесплатно | Цена/изображение |
|---|---|---|---|
| **HuggingFace** | FLUX.1-schnell | ✅ Free tier | $0 |
| **FAL.AI** | fal-ai/flux/schnell | 💰 Кредиты при регистрации | $0.003–$0.025 |
| **Cloudflare** | flux-1-schnell | ✅ 10k units/day | $0 |
| **Mock** | placeholder | ✅ Dev only | $0 |

### Переключение провайдера
```bash
THUMBNAIL_DEFAULT_PROVIDER=HUGGINGFACE  # По умолчанию
THUMBNAIL_DEFAULT_PROVIDER=FAL          # Высокое качество
THUMBNAIL_DEFAULT_PROVIDER=CLOUDFLARE  # Self-hosted edge
THUMBNAIL_DEFAULT_PROVIDER=MOCK        # Локальная разработка
```

Или override на уровне запроса через `providerOverride`.

## 🚀 API

### `POST /thumbnails/generate`

**Request:**
```json
{
  "prompt": "YouTube thumbnail: AI revolution 2026, bold text, high contrast, CTV-optimized",
  "negativePrompt": "blurry, low quality, watermark",
  "videoId": "abc123",
  "aspectRatio": "LANDSCAPE_16_9",
  "providerOverride": "huggingface"
}
```

**Response:**
```json
{
  "jobId": "clzabc123",
  "imageUrl": "http://localhost:3009/static/clzabc123.png",
  "provider": "HUGGINGFACE",
  "model": "black-forest-labs/FLUX.1-schnell",
  "width": 1280,
  "height": 720,
  "costUsd": 0,
  "durationMs": 4521
}
```

### Aspect Ratios
| Значение | Размер | Использование |
|---|---|---|
| `LANDSCAPE_16_9` | 1280×720 | YouTube стандарт |
| `PORTRAIT_9_16` | 720×1280 | Shorts |
| `SQUARE_1_1` | 1024×1024 | Универсальный |

### Остальные эндпоинты
```
GET  /thumbnails               — список с пагинацией
GET  /thumbnails/:id           — конкретный job
GET  /thumbnails/stats         — статистика + расходы
DELETE /thumbnails/:id         — удалить job + файл
GET  /health                   — статус сервиса
GET  /static/:filename         — скачать изображение
```

## 🔧 Установка

```bash
cd core/thumbnail-engine
cp .env.example .env

# Получи бесплатный HuggingFace токен:
# https://huggingface.co/settings/tokens
echo "HUGGINGFACE_API_KEY=hf_xxx" >> .env

docker compose up -d
```

## 📊 Events (Event Bus)

Модуль публикует в Redis Stream `ai-pipeline:events`:

| Event | Payload |
|---|---|
| `thumbnail.generated` | `{ jobId, videoId, imageUrl, provider, model, durationMs, costUsd }` |
| `thumbnail.failed` | `{ jobId, videoId, provider, errorMessage }` |

## 📰 Тест

```bash
# Через API Gateway
curl -X POST http://localhost:3100/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "AI YouTube thumbnail: modern tech 2026"}'

# Напрямую
curl -X POST http://localhost:3009/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test thumbnail", "providerOverride": "mock"}'
```
