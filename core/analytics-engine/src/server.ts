import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { db } from './db.js'
import { logger } from './logger.js'
import { config } from './config.js'
import { analyticsRoutes } from './routes/analytics.routes.js'
import { AnalyticsService } from './services/analytics.service.js'
import { YouTubeService } from './services/youtube.service.js'
import { ReportService } from './services/report.service.js'

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })

  await fastify.register(cors, {
    origin: config.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST'],
  })

  const youtubeService = new YouTubeService()
  const reportService = new ReportService()
  const analyticsService = new AnalyticsService(db, youtubeService, reportService)

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'analytics-engine',
    version: '1.0.0',
    analyticsApiEnabled: !!config.YOUTUBE_OAUTH_TOKEN,
    timestamp: new Date().toISOString(),
  }))

  await fastify.register(analyticsRoutes, { analyticsService })

  fastify.setErrorHandler((error, request, reply) => {
    logger.error({ err: { message: error.message }, url: request.url }, 'Request failed')
    if ((error as any).code === 'P2025' || error.message.toLowerCase().includes('not found')) {
      return reply.status(404).send({ error: 'NotFound', message: error.message })
    }
    if (error.message.includes('already registered')) {
      return reply.status(409).send({ error: 'Conflict', message: error.message })
    }
    if (error.name === 'ZodError' || error.statusCode === 400) {
      return reply.status(400).send({ error: 'ValidationError', message: error.message })
    }
    return reply.status(500).send({ error: 'InternalServerError', message: 'An unexpected error occurred' })
  })

  return fastify
}
