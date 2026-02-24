# AI Pipeline — YouTube Content Automation System

> Стратегия: **ИИ + человек**, а не «чистый ИИ-спам».
> Цель: масштабируемый премиальный контент → агрессивная локализация → Tier-1 рынки.

---

## 🎯 Два канала — одно ядро

### Канал 1 — «Топливный» (Fuel)
- Короткие ролики 30–90 сек на трендовых темах
- Максимум автоматизации, быстрый денежный поток
- Тест ниш и хуков для интеллектуального канала

### Канал 2 — «Интеллектуальный» (Intellectual)
- Глубокий контент 8–15 мин с видео-аватарами
- Высокий retention, Tier-1 аудитория, сильный бренд
- Диалоговый формат, работа с комментариями, мультиязычность

---

## 🧠 6 Модулей единого ядра

| # | Модуль | Назначение | Статус |
|---|--------|-----------|--------|
| 1 | **Topic Engine** | NLP + тренды → список тем с CPM-оценкой | ✅ Готов |
| 2 | **Script Engine** | LLM → скрипты 2 форматов (Short / Deep) | ⏳ Планируется |
| 3 | **Voice & TTS** | Клон голоса, мультиязычная озвучка | ⏳ Планируется |
| 4 | **Media Pipeline** | Аватары, монтаж, CTV-оптимизация | ⏳ Планируется |
| 5 | **Analytics Engine** | Retention, RPM, CTR → обратная связь | ⏳ Планируется |
| 6 | **Community Manager** | AI-ответы в комментариях → новые темы | ⏳ Планируется |

---

## 💰 Монетизация: Tier-1 рынки и топ-ниши

### CPM по странам (целевые рынки)

| Страна | CPM | Приоритет |
|--------|-----|-----------|
| 🇳🇴 Норвегия | $43 | ⭐⭐⭐ |
| 🇦🇺 Австралия | $36 | ⭐⭐⭐ |
| 🇺🇸 США | $32 | ⭐⭐⭐ |
| 🇨🇭 Швейцария | $23 | ⭐⭐⭐ |
| 🇨🇦 Канада | $18 | ⭐⭐ |
| 🇩🇪 Германия | $15 | ⭐⭐ |
| 🇬🇧 Великобритания | $13 | ⭐⭐ |

### Топ-ниши по CPM

| Ниша | CPM диапазон |
|------|--------------|
| 💰 Финансы / Инвестиции | $15–$50 |
| 💻 SaaS / Программное обеспечение | $10–$25 |
| 🎓 Онлайн-образование | $10–$25 |
| 🏥 Здоровье (без медицины) | $8–$15 |
| 📱 Технологии | $8–$12 |

---

## 🎬 Ключевые правила контента (из исследования)

- **45% watch time** YouTube приходится на CTV (телевизоры) → оптимизируем под большой экран
- **Решение «смотреть/нет»** принимается в первые **8 секунд** → хук обязателен
- **«AI slop»** даёт удержание на **70% ниже**, чем контент с человеческим присутствием
- Рост комментариев **+38%** → community management = часть пайплайна

---

## 📦 Структура проекта

```
ai-pipeline/
├── core/
│   ├── topic-engine/          ✅ Module 1 — Topic discovery & management
│   ├── script-engine/         ⏳ Module 2 — LLM script generation
│   ├── voice-engine/          ⏳ Module 3 — TTS & voice cloning
│   ├── media-pipeline/        ⏳ Module 4 — Avatar, montage, CTV
│   ├── analytics-engine/      ⏳ Module 5 — YouTube metrics & feedback
│   └── community-manager/     ⏳ Module 6 — AI comment management
├── apps/
│   └── admin/                 ✅ Admin Dashboard
├── shared/
│   ├── types/                 # Shared TypeScript types
│   └── config/                # Shared config (Tier-1 markets, CPM)
├── docs/
│   └── ARCHITECTURE.md        # Full system architecture
└── .github/workflows/
    └── ci.yml                 # GitHub Actions CI
```

---

## 🚀 Быстрый старт — Topic Engine

```bash
git clone https://github.com/Serguei75/ai-pipeline.git
cd ai-pipeline/core/topic-engine

# Docker (рекомендуется)
docker-compose up -d

# API будет доступен на http://localhost:3001
curl http://localhost:3001/health
```

---

## 🧪 API Examples

```bash
# Создать топик для топливного канала
curl -X POST http://localhost:3001/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "title": "5 AI Tools That Will Replace Your Job in 2026",
    "niche": "TECH",
    "source": "YOUTUBE_TRENDS",
    "channelType": "FUEL",
    "contentFormat": "SHORT_FUEL",
    "targetMarkets": ["US", "UK", "AU"],
    "keywords": ["AI", "jobs", "automation", "2026"]
  }'

# Создать топик для интеллектуального канала
curl -X POST http://localhost:3001/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to Build Passive Income with AI in 2026 (Full Guide)",
    "niche": "FINANCE",
    "source": "GOOGLE_TRENDS",
    "channelType": "INTELLECTUAL",
    "contentFormat": "DEEP_ESSAY",
    "targetMarkets": ["US", "CA", "AU", "NO"],
    "keywords": ["passive income", "AI", "2026", "finance"]
  }'

# AI-генерация топиков
curl -X POST http://localhost:3001/api/topics/generate \
  -H "Content-Type: application/json" \
  -d '{"niche": "FINANCE", "channelType": "INTELLECTUAL", "targetMarkets": ["US", "NO", "AU"], "count": 5}'
```

---

## 🛠️ Технологии

- **Backend:** Node.js 20, TypeScript, Fastify, Prisma, PostgreSQL
- **Frontend:** HTML5, CSS3, Vanilla JS (Admin UI)
- **AI/LLM:** OpenAI GPT-4, Anthropic Claude (planned)
- **TTS:** ElevenLabs, clone voice (planned)
- **Avatars:** HeyGen, D-ID (planned)
- **Analytics:** YouTube Data API v3 (planned)
- **Infrastructure:** Docker, Docker Compose, GitHub Actions

## 📝 License

MIT
