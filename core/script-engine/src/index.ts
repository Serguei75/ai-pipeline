import Fastify from 'fastify'
import cors    from '@fastify/cors'
import helmet from '@fastify/helmet'
import { config }        from './config'
import { logger }        from './logger'
import { connectDb, disconnectDb } from './db'
import { healthRoutes }  from './routes/health.routes'
import { scriptsRoutes } from './routes/scripts.routes'

const app = Fastify({
  loggerInstance:        logger,
  disableRequestLogging: false,
})

const start = async (): Promise<void> => {
  await app.register(cors,   { origin: config.NODE_ENV !== 'production' })
  await app.register(helmet)
  await app.register(healthRoutes)
  await app.register(scriptsRoutes)
  await connectDb()
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  logger.info(`🚀 Script Engine running on port ${config.PORT}`)
}

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down gracefully...')
  await app.close()
  await disconnectDb()
  process.exit(0)
}

process.on('SIGINT',  () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })

void start().catch((err) => {
  logger.error({ err }, 'Fatal: failed to start Script Engine')
  process.exit(1)
})
