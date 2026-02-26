FROM node:20-alpine AS builder
WORKDIR /app

# Copy shared LLM router (imported as ../../../../shared/llm/router.js)
COPY shared/ ./shared/

# Install & build thumbnail-engine
COPY core/thumbnail-engine/package*.json ./
RUN npm install

COPY core/thumbnail-engine/ ./
RUN npm run build || true

# ── Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# sharp needs native libs
RUN apk add --no-cache vips-dev fftw-dev

COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Storage volume mount point
RUN mkdir -p /app/storage/thumbnails

EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3009/thumbnails/providers || exit 1

CMD ["node", "dist/index.js"]
