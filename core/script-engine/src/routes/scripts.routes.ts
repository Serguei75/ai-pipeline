import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { ScriptService } from '../services/script.service.js'
import { ChannelType, ContentFormat, Niche, ScriptStatus } from '../types.js'
import { logger } from '../logger.js'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GenerateScriptSchema = z.object({
  topicId: z.string().uuid(),
  topicTitle: z.string().min(5).max(200),
  channelType: z.nativeEnum(ChannelType),
  contentFormat: z.nativeEnum(ContentFormat),
  niche: z.nativeEnum(Niche),
  targetMarkets: z.array(z.string().length(2)).min(1).max(12),
  keywords: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
  description: z.string().max(1000).optional(),
})

const ApproveHookSchema = z.object({
  hookVariantId: z.string().uuid(),
})

const UpdateScriptSchema = z.object({
  scriptFuel: z.string().optional(),
  scriptDeep: z.string().optional(),
  reviewNotes: z.string().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
)

const RejectScriptSchema = z.object({
  reviewNotes: z.string().min(10),
  reviewedBy: z.string().min(1),
})

const ApproveScriptSchema = z.object({
  approvedBy: z.string().min(1),
})

const ListQuerySchema = z.object({
  status: z.nativeEnum(ScriptStatus).optional(),
  channelType: z.nativeEnum(ChannelType).optional(),
  niche: z.nativeEnum(Niche).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ─── Routes ──────────────────────────────────────────────────────────────────

export const scriptsRoutes: FastifyPluginAsync<{ scriptService: ScriptService }> = async (fastify, opts) => {
  const { scriptService } = opts

  // POST /api/scripts/generate
  // Creates script record + generates 5 hook variants
  // Returns: script with hookVariants[] for human selection
  fastify.post('/api/scripts/generate', async (request, reply) => {
    const body = GenerateScriptSchema.parse(request.body)
    logger.info({ topicId: body.topicId, channelType: body.channelType }, 'Generating script')
    const script = await scriptService.generate(body)
    return reply.status(201).send(script)
  })

  // GET /api/scripts
  // List with optional filters: ?status=HOOK_GENERATED&channelType=INTELLECTUAL&niche=FINANCE
  fastify.get('/api/scripts', async (request, reply) => {
    const query = ListQuerySchema.parse(request.query)
    const scripts = await scriptService.findAll(query)
    return reply.send({ data: scripts, count: scripts.length })
  })

  // GET /api/scripts/:id
  fastify.get('/api/scripts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const script = await scriptService.findById(id)
    return reply.send(script)
  })

  // PATCH /api/scripts/:id
  // Human editor updates script text
  fastify.patch('/api/scripts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = UpdateScriptSchema.parse(request.body)
    const script = await scriptService.update(id, body)
    return reply.send(script)
  })

  // POST /api/scripts/:id/approve-hook
  // Human selects one of 5 hook variants — triggers full script generation
  fastify.post('/api/scripts/:id/approve-hook', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = ApproveHookSchema.parse(request.body)
    logger.info({ scriptId: id, hookVariantId: body.hookVariantId }, 'Approving hook')
    const script = await scriptService.approveHook(id, body)
    return reply.send(script)
  })

  // POST /api/scripts/:id/submit
  // Submit for human review after script generation
  fastify.post('/api/scripts/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string }
    const script = await scriptService.submitForReview(id)
    return reply.send(script)
  })

  // POST /api/scripts/:id/approve
  // Human reviewer approves script — ready for production
  fastify.post('/api/scripts/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = ApproveScriptSchema.parse(request.body)
    const script = await scriptService.approve(id, body)
    return reply.send(script)
  })

  // POST /api/scripts/:id/reject
  // Human reviewer rejects with notes
  fastify.post('/api/scripts/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = RejectScriptSchema.parse(request.body)
    const script = await scriptService.reject(id, body)
    return reply.send(script)
  })

  // DELETE /api/scripts/:id
  fastify.delete('/api/scripts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await scriptService.delete(id)
    return reply.status(204).send()
  })
}
