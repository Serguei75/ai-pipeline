# 📖 API Reference — AI YouTube Pipeline

Все запросы проходят через **API Gateway** (`http://localhost:3100`).

## Topic Engine — `/topics`

| Метод | Путь | Описание |
|---|---|---|
| GET | `/topics` | Список тем |
| POST | `/topics/generate` | Генерация тем |
| POST | `/topics/:id/approve` | Одобрение темы |
| POST | `/topics/:id/reject` | Отклонение темы |

## Script Engine — `/scripts`

| Метод | Путь | Описание |
|---|---|---|
| GET | `/scripts` | Список скриптов |
| POST | `/scripts/generate` | Генерация скрипта |
| POST | `/scripts/:id/approve` | Одобрение скрипта |
| POST | `/scripts/:id/reject` | Отклонение скрипта |

## Voice Engine — `/voice`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/voice/generate` | Генерация аудио |
| GET | `/voice/jobs` | Список задач |
| GET | `/voice/jobs/:id` | Статус задачи |

## Media Engine — `/media`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/media/assemble` | Сборка видео |
| GET | `/media/jobs` | Список задач |

## Analytics Engine — `/analytics`

| Метод | Путь | Описание |
|---|---|---|
| GET | `/analytics/stats` | Статистика |
| POST | `/analytics/sync` | Синх данных YouTube |
| GET | `/analytics/hooks` | Слабые хуки |

## Community Engine — `/community`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/community/sync` | Синх комментариев |
| GET | `/community/comments` | Список комментариев |
| GET | `/community/drafts` | Черновики ответов |
| POST | `/community/drafts/:id/approve` | Одобрение черновика |

## Localization Engine — `/localization`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/localization/tasks` | Создать задачу |
| GET | `/localization/tasks` | Список задач |
| GET | `/localization/tasks/:id` | Статус задачи |

## Hook Tester — `/hook-tester`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/hook-tester/tests` | Создать A/B тест |
| GET | `/hook-tester/tests` | Список тестов |
| POST | `/hook-tester/tests/:id/winner` | Определить победителя |

## Thumbnail Engine — `/thumbnails`

| Метод | Путь | Описание |
|---|---|---|
| POST | `/thumbnails/generate` | Генерация обложки |
| GET | `/thumbnails` | Список задач |
| GET | `/thumbnails/:id` | Детали задачи |
| GET | `/thumbnails/stats` | Статистика + расходы |
| DELETE | `/thumbnails/:id` | Удалить |

## Health & Monitoring

| Метод | Путь | Описание |
|---|---|---|
| GET | `/health/all` | Статус всех сервисов |
| GET | `/registry` | Карта сервисов + URL |
