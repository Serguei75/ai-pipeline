import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { scriptService } from '../services/script.service'
import { hookService }   from '../services/hook.service'
import { AppError }      from '../errors/app.errors'
import { ChannelType, ContentFormat, Niche, ScriptStatus } from '../types'
import { logger } from '../logger'

// ============================
// Validation schemas (Zod)
// ============================

const CreateScriptSchema = z.object({
  topicId:       z.string().uuid(),
  topicTitle:    z.string().min(5).max(300),
  channelType:   z.nativeEnum(ChannelType),
  contentFormat: z.nativeEnum(ContentFormat),
  niche:         z.nativeEnum(Niche),
  targetMarkets: z.array(z.string().length(2)).min(1).max(10),
  languages:     z.array(z.string().min(2).max(5)).optional(),
  context:       z.string().max(2000).optional(),
})

const UpdateScriptSchema = z.object({
  hookText:      z.string().min(10).max(500).optional(),
  script:        z.string().min(50).optional(),
  status:        z.nativeEnum(ScriptStatus).optional(),
  rejectionNote: z.string().max(1000).optional(),
})

const ApproveScriptSchema = z.object({
  approvedBy:     z.string().min(1),
  approvedHookId: z.string().uuid(),
})

const RegenerateScriptSchema = z.object({
  feedback: z.string().max(2000).optional(),
  keepHook: z.boolean().optional(),
})

const ListScriptsQuerySchema = z.object({
  status:        z.nativeEnum(ScriptStatus).optional(),
  channelType:   z.nativeEnum(ChannelType).optional(),
  contentFormat: z.nativeEnum(ContentFormat).optional(),
  niche:         z.nativeEnum(Niche).optional(),
  topicId:       z.string().uuid().optional(),
  page:          z.string().transform(Number).optional(),
  perPage:       z.string().transform(Number).optional(),
})

// ============================
// Error handler
// ============================

const handleError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error:      error.name,
      message:    error.message,
    })
  }
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error:      'ValidationError',
      message:    'Invalid request data',
      details:    error.flatten(),
    })
  }
  logger.error({ error }, 'Unexpected error in scripts route')
  return reply.status(500).send({
    statusCode: 500,
    error:      'InternalServerError',
    message:    'An unexpected error occurred',
  })
}

// ============================
// Routes
// ============================

export const scriptsRoutes = async (app: FastifyInstance): Promise<void> => {

  // POST /api/scripts — create script + trigger generation pipeline
  app.post('/api/scripts', async (req, reply) => {
    try {
      const dto    = CreateScriptSchema.parse(req.body)
      const result = await scriptService.create(dto)
      const script = await scriptService.findById(result.id)
      return reply.status(201).send(script)
    } catch (e) { return handleError(e, reply) }
  })

  // GET /api/scripts — paginated list with filters
  app.get('/api/scripts', async (req, reply) => {
    try {
      const filters = ListScriptsQuerySchema.parse(req.query)
      return reply.send(await scriptService.findMany(filters))
    } catch (e) { return handleError(e, reply) }
  })

  // GET /api/scripts/:id — full script with hooks + revisions
  app.get<{ Params: { id: string } }>('/api/scripts/:id', async (req, reply) => {
    try {
      return reply.send(await scriptService.findById(req.params.id))
    } catch (e) { return handleError(e, reply) }
  })

  // PATCH /api/scripts/:id — update content or status
  app.patch<{ Params: { id: string } }>('/api/scripts/:id', async (req, reply) => {
    try {
      const dto = UpdateScriptSchema.parse(req.body)
      return reply.send(await scriptService.update(req.params.id, dto))
    } catch (e) { return handleError(e, reply) }
  })

  // POST /api/scripts/:id/submit-review — DRAFT → REVIEW
  app.post<{ Params: { id: string } }>('/api/scripts/:id/submit-review', async (req, reply) => {
    try {
      return reply.send(await scriptService.update(req.params.id, { status: ScriptStatus.REVIEW }))
    } catch (e) { return handleError(e, reply) }
  })

  // POST /api/scripts/:id/approve — REVIEW → APPROVED
  app.post<{ Params: { id: string } }>('/api/scripts/:id/approve', async (req, reply) => {
    try {
      const dto = ApproveScriptSchema.parse(req.body)
      return reply.send(await scriptService.approve(req.params.id, dto))
    } catch (e) { return handleError(e, reply) }
  })

  // POST /api/scripts/:id/reject — reject with note
  app.post<{ Params: { id: string } }>('/api/scripts/:id/reject', async (req, reply) => {
    try {
      const body = (req.body as { note?: string }) ?? {}
      return reply.send(await scriptService.update(req.params.id, {
        status:        ScriptStatus.REJECTED,
        rejectionNote: body.note,
      }))
    } catch (e) { return handleError(e, reply) }
  })

  // POST /api/scripts/:id/regenerate — regenerate with optional feedback
  app.post<{ Params: { id: string } }>('/api/scripts/:id/regenerate', async (req, reply) => {
    try {
      const dto = RegenerateScriptSchema.parse(req.body)
      return reply.send(await scriptService.regenerate(req.params.id, dto))
    } catch (e) { return handleError(e, reply) }
  })

  // POST /api/hooks/:id/approve — approve a specific hook variant
  app.post<{ Params: { id: string } }>('/api/hooks/:id/approve', async (req, reply) => {
    try {
      await hookService.approveHook(req.params.id)
      return reply.send({ success: true, hookId: req.params.id })
    } catch (e) { return handleError(e, reply) }
  })

  // DELETE /api/scripts/:id
  app.delete<{ Params: { id: string } }>('/api/scripts/:id', async (req, reply) => {
    try {
      await scriptService.delete(req.params.id)
      return reply.status(204).send()
    } catch (e) { return handleError(e, reply) }
  })
}
