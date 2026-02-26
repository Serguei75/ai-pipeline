FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build || true

# ── Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
RUN npm install --omit=dev --frozen-lockfile 2>/dev/null || npm install --omit=dev

COPY --from=builder /app/dist ./dist
# Include SQL schema for reference / init scripts
COPY --from=builder /app/src/db/schema.sql ./db/schema.sql

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3010/costs/health || exit 1

CMD ["node", "dist/index.js"]
