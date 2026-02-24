import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { db } from './db.js'
import { logger } from './logger.js'
import { config } from './config.js'
import { mediaRoutes } from './routes/media.routes.js'
import { MediaService } from './services/media.service.js'
import { HeyGenService } from './services/heygen.service.js'
import { PexelsService } from './services/pexels.service.js'
import { StorageService } from './services/storage.service.js'

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })

  await fastify.register(cors, {
    origin: config.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'DELETE'],
  })

  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), config.UPLOAD_DIR),
    prefix: '/media/',
    decorateReply: false,
  })

  const heygenService = new HeyGenService()
  const pexelsService = new PexelsService()
  const storageService = new StorageService()
  const mediaService = new MediaService(db, heygenService, pexelsService, storageService)

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'media-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  // List available HeyGen avatars (live from API)
  fastify.get('/api/media/heygen/avatars', async () => {
    return heygenService.listAvatars()
  })

  await fastify.register(mediaRoutes, { mediaService })

  fastify.setErrorHandler((error, request, reply) => {
    logger.error({ err: { message: error.message, code: (error as any).code }, url: request.url }, 'Request failed')
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
