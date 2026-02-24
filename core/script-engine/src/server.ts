import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { db } from './db.js'
import { logger } from './logger.js'
import { config } from './config.js'
import { scriptsRoutes } from './routes/scripts.routes.js'
import { ScriptService } from './services/script.service.js'
import { OpenAIService } from './services/openai.service.js'
import { HookService } from './services/hook.service.js'

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // using pino directly
    disableRequestLogging: false,
  })

  // CORS
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  // Dependency injection
  const openaiService = new OpenAIService()
  const hookService = new HookService(db, openaiService)
  const scriptService = new ScriptService(db, openaiService, hookService)

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'script-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  // Routes
  await fastify.register(scriptsRoutes, { scriptService })

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error({
      err: { message: error.message, stack: error.stack, code: (error as any).code },
      url: request.url,
      method: request.method,
    }, 'Request failed')

    // Prisma not found
    if ((error as any).code === 'P2025' || error.message.toLowerCase().includes('not found')) {
      return reply.status(404).send({ error: 'NotFound', message: error.message })
    }

    // Conflict (already exists)
    if (error.message.includes('already exists')) {
      return reply.status(409).send({ error: 'Conflict', message: error.message })
    }

    // Validation errors
    if (error.name === 'ZodError' || error.statusCode === 400) {
      return reply.status(400).send({ error: 'ValidationError', message: error.message })
    }

    // Business logic errors
    if (error.message.startsWith('Cannot') || error.message.startsWith('No ')) {
      return reply.status(422).send({ error: 'UnprocessableEntity', message: error.message })
    }

    return reply.status(500).send({ error: 'InternalServerError', message: 'An unexpected error occurred' })
  })

  return fastify
}
