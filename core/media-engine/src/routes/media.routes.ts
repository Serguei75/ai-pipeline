import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { MediaService } from '../services/media.service.js'
import { ChannelType, ContentFormat, MediaJobStatus } from '../types.js'

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const SegmentSchema = z.object({
  type: z.enum(['AVATAR', 'SLIDE', 'BROLL', 'GRAPHIC', 'SCREEN_DEMO']),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  text: z.string().min(1),
  notes: z.string().optional(),
  avatarPlan: z.enum(['STUDIO', 'CLOSEUP', 'DIALOGUE']).optional(),
  slideContent: z.string().optional(),
  visualSuggestion: z.string().optional(),
})

const CreateJobSchema = z.object({
  scriptId: z.string().uuid(),
  voiceJobId: z.string().uuid().optional(),
  channelType: z.nativeEnum(ChannelType),
  contentFormat: z.nativeEnum(ContentFormat),
  avatarProfileId: z.string().uuid().optional(),
  segments: z.array(SegmentSchema).min(1),
})

const ListQuerySchema = z.object({
  status: z.nativeEnum(MediaJobStatus).optional(),
  channelType: z.nativeEnum(ChannelType).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ─── Routes ─────────────────────────────────────────────────────────────────

export const mediaRoutes: FastifyPluginAsync<{ mediaService: MediaService }> = async (fastify, opts) => {
  const { mediaService } = opts

  // --- Avatar Profiles ---

  // GET /api/media/profiles/avatars
  fastify.get('/api/media/profiles/avatars', async (request, reply) => {
    const { channelType } = request.query as { channelType?: string }
    const profiles = await mediaService.listAvatarProfiles(channelType)
    return reply.send({ data: profiles, count: profiles.length })
  })

  // GET /api/media/profiles/avatars/default?channelType=INTELLECTUAL
  fastify.get('/api/media/profiles/avatars/default', async (request, reply) => {
    const { channelType } = request.query as { channelType: string }
    if (!channelType) return reply.status(400).send({ error: 'channelType is required' })
    const profile = await mediaService.getDefaultAvatarProfile(channelType)
    if (!profile) return reply.status(404).send({ error: `No default avatar for ${channelType}` })
    return reply.send(profile)
  })

  // --- Media Jobs ---

  // POST /api/media/jobs
  // Accepts script segments — parses types (AVATAR, BROLL, SLIDE...)
  fastify.post('/api/media/jobs', async (request, reply) => {
    const body = CreateJobSchema.parse(request.body)
    const job = await mediaService.createJob(body)
    return reply.status(201).send(job)
  })

  // GET /api/media/jobs
  fastify.get('/api/media/jobs', async (request, reply) => {
    const query = ListQuerySchema.parse(request.query)
    const jobs = await mediaService.findAll(query)
    return reply.send({ data: jobs, count: jobs.length })
  })

  // GET /api/media/jobs/:id
  fastify.get('/api/media/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await mediaService.findById(id)
    return reply.send(job)
  })

  // POST /api/media/jobs/:id/generate-avatars
  // Starts HeyGen video generation for all AVATAR segments
  fastify.post('/api/media/jobs/:id/generate-avatars', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await mediaService.generateAvatarClips(id)
    return reply.send(job)
  })

  // POST /api/media/jobs/:id/fetch-broll
  // Fetches Pexels B-roll for all BROLL segments
  fastify.post('/api/media/jobs/:id/fetch-broll', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await mediaService.fetchBroll(id)
    return reply.send(job)
  })

  // GET /api/media/jobs/:id/assembly
  // Builds and returns the complete VideoAssemblyPlan
  // Ready for video editor import (Premiere, DaVinci, FFmpeg)
  fastify.get('/api/media/jobs/:id/assembly', async (request, reply) => {
    const { id } = request.params as { id: string }
    const plan = await mediaService.buildAssemblyPlan(id)
    return reply.send(plan)
  })

  // DELETE /api/media/jobs/:id
  fastify.delete('/api/media/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await mediaService.delete(id)
    return reply.status(204).send()
  })
}
