import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import { hookTesterRoutes } from './routes/hook-tester.routes'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3008', 10)
const HOST = '0.0.0.0'

const fastify = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
})

fastify.register(cors, { origin: true })
fastify.register(hookTesterRoutes)

fastify.get('/health', async () => ({
  status: 'ok',
  service: 'hook-tester',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}))

process.on('SIGTERM', async () => {
  await fastify.close()
  process.exit(0)
})

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    fastify.log.info(`🧪 Hook Tester running on http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
