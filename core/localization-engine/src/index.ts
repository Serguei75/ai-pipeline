import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import { localizationRoutes } from './routes/localization.routes'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3007', 10)
const HOST = '0.0.0.0'

const fastify = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
})

fastify.register(cors, { origin: true })
fastify.register(localizationRoutes)

// Health check
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'localization-engine',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}))

process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down...')
  await fastify.close()
  process.exit(0)
})

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    fastify.log.info(`🌐 Localization Engine running on http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
