FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY shared ./shared
WORKDIR /app/core/thumbnail-engine
COPY core/thumbnail-engine/package*.json ./
RUN npm install
COPY core/thumbnail-engine/src ./src
COPY core/thumbnail-engine/prisma ./prisma
COPY core/thumbnail-engine/tsconfig.json ./
RUN ./node_modules/.bin/prisma generate
RUN npm run build || true

FROM node:20-alpine AS production
RUN apk add --no-cache openssl ffmpeg
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/shared ./shared
WORKDIR /app/core/thumbnail-engine
COPY --from=builder /app/core/thumbnail-engine/dist ./dist
COPY --from=builder /app/core/thumbnail-engine/node_modules ./node_modules
COPY --from=builder /app/core/thumbnail-engine/package*.json ./
COPY --from=builder /app/core/thumbnail-engine/prisma ./prisma
EXPOSE 3009
CMD ["node", "dist/index.js"]
