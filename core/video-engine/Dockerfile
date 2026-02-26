# ── Builder stage ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json ./
RUN npm install

# Копируем Prisma schema и генерируем клиент
COPY prisma ./prisma
RUN npx prisma generate

# Копируем исходники и собираем
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL нужен для Prisma
RUN apk add --no-cache openssl

# Копируем package.json и production deps
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

# Копируем Prisma schema и сгенерированный клиент
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Копируем скомпилированный код
COPY --from=builder /app/dist ./dist

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3011/api/videos/health || exit 1

# Запускаем синхронизацию БД перед стартом
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
