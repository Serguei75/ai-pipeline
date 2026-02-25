import Fastify from 'fastify'
import cors from '@fastify/cors'
import replyFrom from '@fastify/reply-from'
import axios from 'axios'
import dotenv from 'dotenv'
import { SERVICES } from './config'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3100', 10)
const HOST = '0.0.0.0'
const HEALTH_TIMEOUT = parseInt(process.env.HEALTH_TIMEOUT_MS || '3000', 10)

const fastify = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
  bodyLimit: 10 * 1024 * 1024, // 10 MB
})

// ── Plugins ───────────────────────────────────────────────────────────────
fastify.register(cors, { origin: true })
fastify.register(replyFrom, {
  rewriteRequestHeaders: (_req, headers) => ({
    ...headers,
    'x-forwarded-by': 'ai-pipeline-gateway',
  }),
})

// Forward raw body so proxy doesn't double-parse JSON
fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
  done(null, body)
})

// ── Proxy routes ──────────────────────────────────────────────────────────
// Register a wildcard + exact route for each service prefix.
// Example:
//   Admin UI calls  POST http://localhost:3100/topics
//   Gateway forwards to  POST http://localhost:3001/topics
//
//   Admin UI calls  GET http://localhost:3100/topics/123/approve
//   Gateway forwards to  GET http://localhost:3001/topics/123/approve

for (const [prefix, service] of Object.entries(SERVICES)) {
  // Exact: /topics, /scripts, etc.
  fastify.all(`/${prefix}`, async (req, reply) => {
    fastify.log.debug(`GW → ${service.name}: ${req.method} /${prefix}`)
    return reply.from(`${service.url}${req.url}`)
  })

  // Wildcard: /topics/*, /scripts/*, etc.
  fastify.all(`/${prefix}/*`, async (req, reply) => {
    fastify.log.debug(`GW → ${service.name}: ${req.method} ${req.url}`)
    return reply.from(`${service.url}${req.url}`)
  })
}

// ── Gateway own health ────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'api-gateway',
  version: '1.0.0',
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}))

// ── Aggregate health of ALL services ─────────────────────────────────────
fastify.get('/health/all', async () => {
  const checks = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([prefix, service]) => {
      const start = Date.now()
      try {
        const { data } = await axios.get(`${service.url}/health`, {
          timeout: HEALTH_TIMEOUT,
        })
        return {
          prefix,
          name: service.name,
          status: 'ok',
          latencyMs: Date.now() - start,
          version: data?.version ?? 'unknown',
          uptime: data?.uptime ?? null,
        }
      } catch {
        return {
          prefix,
          name: service.name,
          status: 'offline',
          latencyMs: Date.now() - start,
        }
      }
    }),
  )

  const services = checks.map((r) =>
    r.status === 'fulfilled' ? r.value : { status: 'error' },
  )
  const online = services.filter((s) => s.status === 'ok').length
  const total = Object.keys(SERVICES).length

  return {
    status: online === total ? 'ok' : online > 0 ? 'degraded' : 'offline',
    online,
    total,
    services,
    gatewayUptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }
})

// ── Service registry ──────────────────────────────────────────────────────
fastify.get('/registry', async () => ({
  services: Object.entries(SERVICES).map(([prefix, service]) => ({
    prefix,
    name: service.name,
    description: service.description,
    port: service.port,
    url: service.url,
    endpoints: [`/${prefix}`, `/${prefix}/*`],
  })),
  gateway: {
    port: PORT,
    url: `http://localhost:${PORT}`,
  },
}))

// ── Graceful shutdown ─────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM — shutting down gateway...')
  await fastify.close()
  process.exit(0)
})

// ── Start ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    fastify.log.info(`🔀 API Gateway    →  http://localhost:${PORT}`)
    fastify.log.info(`📊 Health (all)  →  http://localhost:${PORT}/health/all`)
    fastify.log.info(`📜 Registry      →  http://localhost:${PORT}/registry`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
