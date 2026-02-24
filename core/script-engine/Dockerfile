# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
