import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { db } from './db.js'
import { logger } from './logger.js'
import { config } from './config.js'
import { voiceRoutes } from './routes/voice.routes.js'
import { VoiceService } from './services/voice.service.js'
import { ElevenLabsService } from './services/elevenlabs.service.js'
import { StorageService } from './services/storage.service.js'

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })

  await fastify.register(cors, {
    origin: config.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'DELETE'],
  })

  // Serve generated audio files statically
  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), config.UPLOAD_DIR),
    prefix: '/audio/',
    decorateReply: false,
  })

  // Dependency injection
  const elevenlabsService = new ElevenLabsService()
  const storageService = new StorageService()
  const voiceService = new VoiceService(db, elevenlabsService, storageService)

  // Health
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'voice-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  // ElevenLabs subscription info
  fastify.get('/api/voice/subscription', async () => {
    return elevenlabsService.getSubscriptionInfo()
  })

  await fastify.register(voiceRoutes, { voiceService })

  fastify.setErrorHandler((error, request, reply) => {
    logger.error({
      err: { message: error.message, code: (error as any).code },
      url: request.url,
      method: request.method,
    }, 'Request failed')

    if ((error as any).code === 'P2025' || error.message.toLowerCase().includes('not found')) {
      return reply.status(404).send({ error: 'NotFound', message: error.message })
    }
    if (error.message.includes('already exists')) {
      return reply.status(409).send({ error: 'Conflict', message: error.message })
    }
    if (error.name === 'ZodError' || error.statusCode === 400) {
      return reply.status(400).send({ error: 'ValidationError', message: error.message })
    }
    if (error.message.startsWith('Cannot')) {
      return reply.status(422).send({ error: 'UnprocessableEntity', message: error.message })
    }
    return reply.status(500).send({ error: 'InternalServerError', message: 'An unexpected error occurred' })
  })

  return fastify
}
