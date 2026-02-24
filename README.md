# AI Pipeline — YouTube Content Automation System

Полноценная система автоматизации создания YouTube контента с помощью AI.

## 📦 Структура проекта

```
ai-pipeline/
├── core/                      # Backend модули
│   └── topic-engine/         ✅ Topic Engine API
│       ├── prisma/           # Database schema (PostgreSQL)
│       ├── src/              # TypeScript source code
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── package.json
├── apps/
│   └── admin/                ✅ Admin UI (HTML Dashboard)
│       └── index.html
└── shared/
    ├── types/
    └── config/
```

## 🚀 Быстрый старт

### Backend — Topic Engine API

```bash
# Docker (рекомендуется)
cd core/topic-engine
docker-compose up -d

# Локально
cd core/topic-engine
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

API: `http://localhost:3001`

### Frontend — Admin UI

```bash
cd apps/admin
npx serve . -p 3000
```

UI: `http://localhost:3000`

## 📚 Модули

| Модуль | Статус | Описание |
|---|---|---|
| Topic Engine | ✅ Готов | REST API, PostgreSQL, Prisma |
| Admin UI | ✅ Готов | Dashboard, управление топиками |
| Script Engine | ⏳ В разработке | LLM генерация скриптов |
| Media Pipeline | ⏳ В разработке | TTS, аватары, монтаж |
| Localization Engine | ⏳ В разработке | Мультиязычность |
| Analytics Engine | ⏳ В разработке | YouTube метрики |

## 🧪 Тестирование API

```bash
# Health check
curl http://localhost:3001/health

# Создать топик
curl -X POST http://localhost:3001/api/topics \
  -H "Content-Type: application/json" \
  -d '{"title": "AI Revolution 2026", "niche": "TECH", "source": "MANUAL", "targetMarkets": ["US", "UK"]}'

# Получить список топиков
curl http://localhost:3001/api/topics

# Одобрить топик
curl -X POST http://localhost:3001/api/topics/{id}/approve
```

## 🛠️ Технологии

- **Backend:** Node.js, TypeScript, Fastify, Prisma, PostgreSQL
- **Frontend:** HTML5, CSS3, Vanilla JS
- **Infrastructure:** Docker, Docker Compose, GitHub Actions
- **AI:** OpenAI API, Claude API (planned)

## 📝 License

MIT
