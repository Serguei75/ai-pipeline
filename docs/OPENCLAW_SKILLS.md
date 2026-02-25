# OpenClaw Skills: Каталог интеграции

> **Источник:** [openclaw/skills](https://github.com/openclaw/skills)  
> **Дата аудита:** 2026-02-25  
> **Принцип:** Не строим то, что уже есть. Интегрируем готовые скиллы через NanoBot.

## Приоритеты интеграции

| Приоритет | Критерий |
|-----------|----------|
| 🔴 P0 | Заменяет или является ядром существующего сервиса |
| 🟠 P1 | Значительно усиливает существующий сервис |
| 🟡 P2 | Добавляет новый канал дистрибуции или форма |

---

## 🔴 P0 — Критические (реализовать в первую очередь)

### 1. meta-video-ad-deconstructor

- **Автор:** [fortytwode](https://github.com/openclaw/skills/tree/main/skills/fortytwode/meta-video-ad-deconstructor)
- **Технология:** Python + Vertex AI / Gemini
- **Что делает:** Рентген видеорекламы — разбивает на 10 маркетинговых измерений:
  - `spoken_hooks` — крючки из транскрипта с timestamp, тип, effectiveness score
  - `visual_hooks` — визуальные паттерны удержания
  - `text_hooks` — текстовые триггеры на экране
  - `social_proof` — отзывы, счётчики, credibility score
  - `urgency_scarcity` — тактики срочности и дефицита
  - `emotional_triggers` — страх, желание, принадлежность
  - `problem_solution` — pain point → resolution arc
  - `cta_analysis` — эффективность CTA
  - `target_audience` — точный портрет ЦА
  - `unique_mechanism` — уникальное преимущество продукта
- **Интеграция:** Ядро `services/competitor-intel/`
- **MCP tool:** `deconstruct_competitor_video(url, is_gaming?)`
- **Зависимости:** `vertexai`, Google Cloud credentials

### 2. tubescribe

- **Автор:** [matusvojtek](https://github.com/openclaw/skills/tree/main/skills/matusvojtek/tubescribe)
- **Что делает:** YouTube URL → полный транскрипт с таймкодами
- **Интеграция:** Препроцессор для `meta-video-ad-deconstructor`
- **Цепочка:** `YouTube URL → tubescribe → transcript → deconstructor → marketing JSON`
- **MCP tool:** `transcribe_youtube_video(url)`

### 3. youtube-voice-summarizer-elevenlabs

- **Автор:** [franciscoandsam](https://github.com/openclaw/skills/tree/main/skills/franciscoandsam/youtube-voice-summarizer-elevenlabs)
- **Технология:** Python + ElevenLabs TTS
- **Что делает:** YouTube URL → транскрипт → summary → ElevenLabs TTS → аудиофайл
- **Интеграция:** Ядро `services/voice-engine/` — заменяет кастомный код
- **MCP tool:** `generate_voiceover(script_text, voice_id?, style?)`
- **Зависимости:** ElevenLabs API key

---

## 🟠 P1 — Важные (реализовать во вторую очередь)

### 4. vea (Video Engagement Analytics)

- **Автор:** [shawnshenopeninterx](https://github.com/openclaw/skills/tree/main/skills/shawnshenopeninterx/vea)
- **Что делает:** Анализирует метрики вовлечённости видео — retention curve, engagement rate, CTR
- **Интеграция:** Усиливает `services/analytics-engine/`
- **MCP tool:** `analyze_video_engagement(video_id, platform?)`

### 5. genvirall-skill

- **Автор:** [fdarkaou](https://github.com/openclaw/skills/tree/main/skills/fdarkaou/genvirall-skill)
- **Что делает:** Предсказывает виральный потенциал темы до начала производства
- **Интеграция:** Новый фильтр между `topic-engine` и `script-engine`
- **Логика:** `viral_score < 60` → отклонить тему → выбрать следующую
- **MCP tool:** `predict_virality(topic, hooks_list, platform)`

### 6. google-gemini-media

- **Автор:** [xsir0](https://github.com/openclaw/skills/tree/main/skills/xsir0/google-gemini-media)
- **Технология:** Vertex AI Gemini multimodal
- **Что делает:** Анализирует видео, изображения, аудио нативно — генерирует описания сцен, b-roll рекомендации
- **Интеграция:** Усиливает `services/media-engine/`
- **MCP tool:** `analyze_media(file_path_or_url, task_type)`

### 7. content-remix-studio

- **Автор:** [akhmittra](https://github.com/openclaw/skills/tree/main/skills/akhmittra/content-remix-studio)
- **Что делает:** Берёт одно видео и ремиксирует под разные форматы: Shorts, Reels, X clips
- **Интеграция:** Новый постпроцессинговый сервис — `services/content-remix/` (новый)
- **MCP tool:** `remix_video(video_url, target_formats: string[])`

---

## 🟡 P2 — Расширения (третья волна)

### 8. social-media-management

- **Автор:** [shashwatgtm](https://github.com/openclaw/skills/tree/main/skills/shashwatgtm/social-media-management)
- **Что делает:** Распределяет контент по всем платформам: X, LinkedIn, Instagram, Facebook
- **Интеграция:** Расширяет `services/scheduler/` — добавляет кросс-постинг
- **MCP tool:** `publish_to_social(content, platforms, schedule_time?)`

### 9. audiopod

- **Автор:** [rakesh1002](https://github.com/openclaw/skills/tree/main/skills/rakesh1002/audiopod)
- **Что делает:** Конвертирует текстовый контент в подкаст с несколькими голосами
- **Интеграция:** Новый канал дистрибуции — тот же скрипт → подкаст + YouTube параллельно
- **MCP tool:** `create_podcast(script, speakers: [{name, voice_id}])`

### 10. story-video-skill

- **Автор:** [snail3d](https://github.com/openclaw/skills/tree/main/skills/snail3d/story-video-skill)
- **Что делает:** Генерирует сторителлинг-видео с синхронизированным voiceover
- **Интеграция:** Альтернативный стиль в `services/media-engine/` — формат «история»
- **MCP tool:** `create_story_video(narrative, style?, duration?)`

---

## Полная карта потока данных

```
     ┌─────────────────────────────────┐
     │         NanoBot (мозг)          │
     │    Cron / Heartbeat / User req  │
     └────────────┬────────────────────┘
                  │
         ┌────────▼────────┐
         │  topic-engine   │  search_trending()
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ genvirall-skill │  predict_virality()  ← P1
         │  viral_score>60?│
         └────────┬────────┘
              ДА  │  НЕТ → следующая тема
                  │
    ┌─────────────▼──────────────────┐
    │      competitor-intel          │
    │  tubescribe → deconstructor    │  P0+P0
    │  [hooks][triggers][CTA JSON]   │
    └─────────────┬──────────────────┘
                  │
         ┌────────▼────────┐
         │  script-engine  │  generate_script(topic, competitor_json)
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   hook-tester   │  benchmark_hook(our_hook, competitors)
         │   score >= 80?  │
         └────────┬────────┘
              ДА  │  НЕТ → улучшить хук
                  │
    ┌─────────────▼──────────────────┐
    │         voice-engine           │
    │  youtube-voice-summarizer      │  P0
    │  ElevenLabs TTS → audio.mp3   │
    └─────────────┬──────────────────┘
                  │
    ┌─────────────▼──────────────────┐
    │         media-engine           │
    │  google-gemini-media scenes    │  P1
    │  story-video-skill (opt)       │  P2
    │  → video.mp4                   │
    └─────────────┬──────────────────┘
                  │
    ┌─────────────▼──────────────────┐
    │          scheduler             │
    │  → YouTube (upload)            │
    │  → content-remix-studio        │  P1 → Shorts/Reels
    │  → social-media-management     │  P2 → X/LinkedIn
    │  → audiopod                    │  P2 → Podcast
    └─────────────┬──────────────────┘
                  │
    ┌─────────────▼──────────────────┐
    │  analytics-engine + vea        │  P1
    │  24/7 monitoring → Heartbeat   │
    └────────────────────────────────┘
```

---

## Реализация: порядок задач

### Sprint 1: P0 скиллы (competitor-intel + voice-engine)

```
[ ] services/competitor-intel: добавить tubescribe интеграцию
[ ] services/competitor-intel: добавить meta-video-ad-deconstructor
[ ] services/competitor-intel: добавить /mcp/ эндпоинт
[ ] services/voice-engine: интегрировать youtube-voice-summarizer-elevenlabs
[ ] services/voice-engine: добавить /mcp/ эндпоинт
[ ] nanobot/config.json: зарегистрировать первые MCP серверы
[ ] Тест: NanoBot → competitor-intel MCP → deconstruct видео
```

### Sprint 2: MCP для всех сервисов

```
[ ] Все 11 сервисов: добавить /mcp/ эндпоинт
[ ] docker-compose.yml: добавить nanobot-gateway сервис
[ ] nanobot/workspace/HEARTBEAT.md: настроить автономные задачи
[ ] nanobot/config.json: полная конфигурация
[ ] Тест: полный автономный pipeline от темы до публикации
```

### Sprint 3: P1 скиллы (усиление)

```
[ ] Интеграция genvirall-skill как фильтра виральности
[ ] Интеграция vea в analytics-engine
[ ] Интеграция google-gemini-media в media-engine
[ ] Интеграция content-remix-studio (новый сервис)
```

### Sprint 4: P2 скиллы (дистрибуция)

```
[ ] social-media-management → кросс-постинг
[ ] audiopod → подкаст версии
[ ] story-video-skill → альтернативный формат
```
