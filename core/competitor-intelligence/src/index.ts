import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './db'
import { config } from './config'
import { YouTubeService } from './services/youtube'
import { AnalyzerService } from './services/analyzer'
import { SyncService } from './services/sync'
import { EventPublisher } from './services/events'
import { channelsRoutes } from './routes/channels'
import { videosRoutes } from './routes/videos'
import { trendsRoutes } from './routes/trends'
import { ideasRoutes } from './routes/ideas'

const app = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
  bodyLimit: 1024 * 1024,
})

app.register(cors, { origin: true })

// ── Health ───────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  service: 'competitor-intelligence',
  version: '1.0.0',
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}))

// ── Services ─────────────────────────────────────────────────────────────
const events = new EventPublisher()
const youtube = new YouTubeService(config.youtubeApiKey)
const analyzer = new AnalyzerService()
const sync = new SyncService(prisma, youtube, events)

// ── Routes ───────────────────────────────────────────────────────────────
app.register(channelsRoutes, { prefix: '/competitors/channels', youtube, sync })
app.register(videosRoutes, { prefix: '/competitors/videos' })
app.register(trendsRoutes, { prefix: '/competitors/trends', analyzer, events })
app.register(ideasRoutes, { prefix: '/competitors/ideas', events })

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async () => {
  sync.stop()
  events.disconnect()
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// ── Start ───────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await events.connect()
    await prisma.$connect()
    sync.start()
    await app.listen({ port: config.port, host: '0.0.0.0' })
    app.log.info(`🔍 Competitor Intelligence  →  http://localhost:${config.port}`)
    app.log.info(`   Channels  →  GET /competitors/channels`)
    app.log.info(`   Trends    →  GET /competitors/trends`)
    app.log.info(`   Ideas     →  GET /competitors/ideas`)
    app.log.info(`   Analyze   →  POST /competitors/trends/analyze`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
