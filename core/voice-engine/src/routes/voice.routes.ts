import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { VoiceService } from '../services/voice.service.js'
import { ChannelType, ContentFormat, VoiceJobStatus } from '../types.js'

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const CreateJobSchema = z.object({
  scriptId: z.string().uuid(),
  channelType: z.nativeEnum(ChannelType),
  contentFormat: z.nativeEnum(ContentFormat),
  voiceProfileId: z.string().uuid(),
  scriptText: z.string().min(10),
  languages: z.array(z.string().length(2)).default(['en']),
})

const LocalizeSchema = z.object({
  languages: z.array(z.string().length(2)).min(1),
  translatedTexts: z.record(z.string().length(2), z.string().min(10)),
})

const ListQuerySchema = z.object({
  status: z.nativeEnum(VoiceJobStatus).optional(),
  channelType: z.nativeEnum(ChannelType).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ─── Routes ──────────────────────────────────────────────────────────────────

export const voiceRoutes: FastifyPluginAsync<{ voiceService: VoiceService }> = async (fastify, opts) => {
  const { voiceService } = opts

  // --- Voice Profiles ---

  // GET /api/voice/profiles
  // List available voice profiles (seeded via prisma/seed.ts)
  fastify.get('/api/voice/profiles', async (request, reply) => {
    const { channelType } = request.query as { channelType?: string }
    const profiles = await voiceService.listProfiles(channelType)
    return reply.send({ data: profiles, count: profiles.length })
  })

  // GET /api/voice/profiles/default
  // Get default profile for a channel type: ?channelType=INTELLECTUAL
  fastify.get('/api/voice/profiles/default', async (request, reply) => {
    const { channelType } = request.query as { channelType: string }
    if (!channelType) return reply.status(400).send({ error: 'channelType query param required' })
    const profile = await voiceService.getDefaultProfile(channelType)
    if (!profile) return reply.status(404).send({ error: `No default profile for ${channelType}` })
    return reply.send(profile)
  })

  // --- Voice Jobs ---

  // POST /api/voice/jobs
  // Create job record (does not start generation yet)
  fastify.post('/api/voice/jobs', async (request, reply) => {
    const body = CreateJobSchema.parse(request.body)
    const job = await voiceService.createJob(body)
    return reply.status(201).send(job)
  })

  // GET /api/voice/jobs
  fastify.get('/api/voice/jobs', async (request, reply) => {
    const query = ListQuerySchema.parse(request.query)
    const jobs = await voiceService.findAll(query)
    return reply.send({ data: jobs, count: jobs.length })
  })

  // GET /api/voice/jobs/:id
  fastify.get('/api/voice/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await voiceService.findById(id)
    return reply.send(job)
  })

  // POST /api/voice/jobs/:id/generate
  // Start EN audio generation (chunks text, calls ElevenLabs, saves MP3)
  fastify.post('/api/voice/jobs/:id/generate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await voiceService.generateAudio(id)
    return reply.send(job)
  })

  // POST /api/voice/jobs/:id/localize
  // Generate localized audio tracks (DE, ES, JA...)
  // Research: YouTube Multi-Audio = same video, multiple tracks
  // → no view fragmentation, higher total watch time, stronger algorithm signal
  fastify.post('/api/voice/jobs/:id/localize', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = LocalizeSchema.parse(request.body)
    const job = await voiceService.generateLocalizations(id, body)
    return reply.send(job)
  })

  // GET /api/voice/jobs/:id/package
  // Returns YouTube Multi-Audio package with all tracks + upload instructions
  fastify.get('/api/voice/jobs/:id/package', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pkg = await voiceService.packageForYouTube(id)
    return reply.send(pkg)
  })

  // DELETE /api/voice/jobs/:id
  fastify.delete('/api/voice/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await voiceService.delete(id)
    return reply.status(204).send()
  })
}
