import { buildServer } from './server.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { db } from './db.js'

async function main(): Promise<void> {
  await db.$connect()
  logger.info('Database connected')

  const server = await buildServer()
  await server.listen({ port: config.PORT, host: '0.0.0.0' })

  logger.info(
    { port: config.PORT, env: config.NODE_ENV, analyticsApi: !!config.YOUTUBE_OAUTH_TOKEN },
    'Analytics Engine is running',
  )

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down gracefully')
    await server.close()
    await db.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err: unknown) => {
  logger.error(err, 'Fatal startup error')
  process.exit(1)
})
