# 🚀 DEPLOY.md — Полный гайд по деплою AI Pipeline

> **Стек:** Oracle Cloud Always Free (4 CPU ARM / 24 GB RAM) + Coolify + GitHub Actions + GHCR  
> **Стоимость:** $0/месяц навсегда  
> **Время первого деплоя:** ~45 минут

---

## Содержание

1. [Регистрация Oracle Cloud](#1-регистрация-oracle-cloud)
2. [Создание VPS](#2-создание-vps)
3. [Установка Coolify](#3-установка-coolify)
4. [Настройка GitHub Secrets](#4-настройка-github-secrets)
5. [Сделать репо публичным](#5-сделать-репо-публичным)
6. [Первый деплой](#6-первый-деплой)
7. [Мониторинг и логи](#7-мониторинг-и-логи)
8. [Обновление через CI/CD](#8-обновление-через-cicd)

---

## 1. Регистрация Oracle Cloud

1. Открой [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Нажми **Start for Free**
3. Выбери регион: **Germany Central (Frankfurt)** или **Netherlands Amsterdam**
   - ⚠️ Регион выбирается один раз и не меняется!
4. Заполни данные, укажи кредитку (снимут и вернут $1 для верификации)
5. После регистрации: Settings → Subscription → **Upgrade to Pay As You Go**
   - ❗ Это не значит «начать платить» — это разблокирует ARM A1 ресурсы
   - Деньги не снимаются, пока ты в рамках Always Free лимитов

---

## 2. Создание VPS

1. В консоли Oracle: **Compute → Instances → Create Instance**
2. Name: `ai-pipeline`
3. Image: **Ubuntu 22.04**
4. Shape: нажми **Change Shape** → **Ampere** → `VM.Standard.A1.Flex`
   - OCPU: **4** | Memory: **24 GB**
5. Networking: Create new VCN или выбери существующую
6. **Add SSH keys** — загрузи свой публичный ключ или сгенерируй новый
   - Если нет ключей: `ssh-keygen -t ed25519 -C "oracle-vps"`
   - Публичный ключ: `~/.ssh/id_ed25519.pub`
   - Приватный ключ понадобится для GitHub Secrets
7. Boot volume: **200 GB**
8. Нажми **Create**

### Открыть порты в Security Rules:

```
Compute → Instances → [твой инстанс] → VCN → Security Lists → Ingress Rules
```

Добавь правила:

| Source CIDR | Protocol | Port Range | Описание |
|---|---|---|---|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |
| 0.0.0.0/0 | TCP | 3000-3011 | Services |
| 0.0.0.0/0 | TCP | 3100 | API Gateway |
| 0.0.0.0/0 | TCP | 8000 | Coolify UI |

> ⚠️ Также добавь правила в **Ubuntu iptables** на самом VPS:
> ```bash
> sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
> sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
> sudo iptables -I INPUT -p tcp --dport 3000:3011 -j ACCEPT
> sudo iptables -I INPUT -p tcp --dport 3100 -j ACCEPT
> sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
> sudo netfilter-persistent save
> ```

---

## 3. Установка Coolify

Подключись к VPS:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<VPS_IP>
```

Установи Docker + Coolify одной командой:

```bash
# Обнови систему
sudo apt update && sudo apt upgrade -y

# Установи Coolify (включает Docker автоматически)
curl -fsSL https://cdn.coolify.io/install.sh | bash
```

Coolify UI будет доступен на `http://<VPS_IP>:8000`

### Настройка в Coolify UI:

1. Создай admin аккаунт
2. **Servers → Add Server → Localhost** (сам VPS)
3. **Projects → New Project** → `ai-pipeline`
4. Подключи GitHub репо: **Sources → GitHub App**
5. Coolify будет автоматически деплоить при push в main

---

## 4. Настройка GitHub Secrets

В репозитории: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Значение | Обязательный |
|---|---|---|
| `VPS_HOST` | IP адрес Oracle VPS (напр. `152.70.123.45`) | ✅ |
| `VPS_USER` | `ubuntu` | ✅ |
| `VPS_SSH_KEY` | Приватный SSH ключ (содержимое `~/.ssh/id_ed25519`) | ✅ |
| `VPS_DEPLOY_PATH` | `/home/ubuntu/ai-pipeline` | ✅ |
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | ✅ |
| `TELEGRAM_ALLOWED_USER_ID` | Твой Telegram ID (от @userinfobot) | ✅ |

> 💡 `GITHUB_TOKEN` добавлять не нужно — он автоматически создаётся GitHub Actions при каждом запуске.

---

## 5. Сделать репо публичным

**Settings → General → Danger Zone → Change repository visibility → Public**

После этого:
- GitHub Actions: **безлимитные минуты** 🎉
- GHCR: **бесплатное хранилище** образов
- Coolify: может читать репо без токена

---

## 6. Первый деплой

### На VPS (один раз):

```bash
# Зайди на VPS
ssh -i ~/.ssh/id_ed25519 ubuntu@<VPS_IP>

# Создай рабочую папку
mkdir -p /home/ubuntu/ai-pipeline
cd /home/ubuntu/ai-pipeline

# Скачай .env.example
curl -sO https://raw.githubusercontent.com/Serguei75/ai-pipeline/main/.env.example
cp .env.example .env

# Заполни ключи
nano .env
```

Минимальный `.env` для первого запуска:

```env
GEMINI_API_KEY=your_gemini_key_here
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOWED_USER_ID=your_telegram_id
POSTGRES_PASSWORD=strong_random_password_here
YOUTUBE_API_KEY=your_youtube_key
```

### Запуск:

```bash
# Войди в GHCR (используй GitHub PAT или GITHUB_TOKEN)
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u Serguei75 --password-stdin

# Подтяни образы и запусти
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Проверь статус
docker compose -f docker-compose.prod.yml ps

# Логи всех сервисов
docker compose -f docker-compose.prod.yml logs -f
```

---

## 7. Мониторинг и логи

### Coolify UI (рекомендуется)
`http://<VPS_IP>:8000` — визуальный дашборд, логи, перезапуск контейнеров

### CLI команды:

```bash
# Статус всех контейнеров
docker compose -f docker-compose.prod.yml ps

# Логи конкретного сервиса
docker compose -f docker-compose.prod.yml logs -f topic-engine

# Health check API Gateway
curl http://localhost:3100/health

# Использование ресурсов
docker stats

# Перезапуск одного сервиса (без даунтайма остальных)
docker compose -f docker-compose.prod.yml restart topic-engine
```

### Uptime Kuma (опционально, self-hosted):

```bash
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3200:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:latest
```

Откроется на `http://<VPS_IP>:3200` — добавь мониторинг всех 14 эндпоинтов `/health`.

---

## 8. Обновление через CI/CD

Автоматический флоу после настройки:

```
git push origin main
        ↓
CI (ci.yml)     — build + lint всех 14 сервисов (~5-10 мин)
        ↓
Publish (publish.yml) — push образов в GHCR (~15-20 мин параллельно)
        ↓
Deploy (deploy.yml)   — SSH на VPS, docker compose pull + up -d (~2 мин)
        ↓
Telegram уведомление  — ✅ Deployed или ❌ Failed
```

### Ручной деплой (если нужно срочно):

1. В GitHub → **Actions → Deploy to VPS → Run workflow**

---

## Архитектура (итог)

```
┌─────────────────────────────────────────────────────┐
│              GitHub (публичное репо)                │
│  push → CI → Publish → GHCR → Deploy → VPS         │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│         Oracle Cloud Always Free VPS                │
│         4 CPU ARM / 24 GB RAM / 200 GB              │
│                                                     │
│  Coolify :8000  ←──── UI управления                 │
│                                                     │
│  Admin UI     :3000   ← Next.js dashboard           │
│  Topic Engine :3001   ─┐                            │
│  Script Engine:3002    │                            │
│  Voice Engine :3003    ├── 14 микросервисов         │
│  ...          :3004-11 │                            │
│  API Gateway  :3100   ─┘                            │
│  Redis        :6379   ← Event Bus                   │
│  PostgreSQL ×8 :5432-5439                           │
│  Telegram Bot (long-polling, без порта)              │
└─────────────────────────────────────────────────────┘

Стоимость: $0/месяц 🎉
```
