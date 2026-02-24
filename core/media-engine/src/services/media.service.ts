import type { PrismaClient } from '@prisma/client'
import type { HeyGenService } from './heygen.service.js'
import type { PexelsService } from './pexels.service.js'
import type { StorageService } from './storage.service.js'
import {
  ChannelType,
  MediaJobStatus,
  ClipStatus,
  type CreateMediaJobDTO,
  type MediaJobFilters,
  type VideoAssemblyPlan,
  type AssemblyEntry,
  type ScriptSegment,
} from '../types.js'
import { logger } from '../logger.js'

export class MediaService {
  constructor(
    private readonly db: PrismaClient,
    private readonly heygen: HeyGenService,
    private readonly pexels: PexelsService,
    private readonly storage: StorageService,
  ) {}

  // ── Create media job ──────────────────────────────────────────────────

  async createJob(dto: CreateMediaJobDTO) {
    const existing = await this.db.mediaJob.findUnique({ where: { scriptId: dto.scriptId } })
    if (existing) {
      throw new Error(`Media job for script ${dto.scriptId} already exists (id: ${existing.id})`)
    }

    if (dto.avatarProfileId) {
      await this.db.avatarProfile.findUniqueOrThrow({ where: { id: dto.avatarProfileId } })
    }

    return this.db.mediaJob.create({
      data: {
        scriptId: dto.scriptId,
        voiceJobId: dto.voiceJobId,
        channelType: dto.channelType,
        contentFormat: dto.contentFormat,
        avatarProfileId: dto.avatarProfileId,
        segments: dto.segments as any,
        status: MediaJobStatus.PENDING,
      },
      include: { avatarProfile: true, avatarClips: true, brollAssets: true },
    })
  }

  // ── Generate all avatar clips (AVATAR segments → HeyGen) ────────────────

  async generateAvatarClips(jobId: string) {
    const job = await this.db.mediaJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { avatarProfile: true },
    })

    if (job.status !== MediaJobStatus.PENDING) {
      throw new Error(`Cannot generate avatars: job is in status "${job.status}", expected PENDING`)
    }

    if (!job.avatarProfile) {
      throw new Error('No avatar profile assigned to this job')
    }

    await this.db.mediaJob.update({
      where: { id: jobId },
      data: { status: MediaJobStatus.AVATAR_GENERATING, startedAt: new Date() },
    })

    const segments = job.segments as ScriptSegment[]
    const avatarSegments = segments
      .map((seg, index) => ({ seg, index }))
      .filter(({ seg }) => seg.type === 'AVATAR')

    logger.info({ jobId, avatarSegments: avatarSegments.length }, 'Starting avatar clip generation')

    try {
      for (const { seg, index } of avatarSegments) {
        // Create clip record as PROCESSING
        const clip = await this.db.avatarClip.create({
          data: {
            jobId,
            segmentIndex: index,
            segmentType: 'AVATAR',
            startSec: seg.startSec,
            endSec: seg.endSec,
            text: seg.text,
            notes: seg.notes,
            avatarPlan: seg.avatarPlan,
            status: ClipStatus.PROCESSING,
          },
        })

        try {
          // Determine audio URL for this segment
          // In production: fetch segment-level audio from Voice Engine
          // For now: use job-level audio from voiceJobId reference
          const audioUrl = `${process.env.VOICE_ENGINE_URL ?? 'http://localhost:3003'}/audio/${job.voiceJobId ?? jobId}-en.mp3`

          const heygenVideoId = await this.heygen.createVideo({
            avatarId: job.avatarProfile.heygenAvatarId,
            avatarStyle: job.avatarProfile.heygenAvatarStyle,
            backgroundColor: job.avatarProfile.backgroundColor,
            audioUrl,
          })

          // Poll for completion
          const result = await this.heygen.waitForCompletion(heygenVideoId)

          await this.db.avatarClip.update({
            where: { id: clip.id },
            data: {
              heygenVideoId,
              videoUrl: result.videoUrl,
              thumbnailUrl: result.thumbnailUrl,
              status: ClipStatus.READY,
            },
          })

          logger.info({ jobId, clipId: clip.id, videoUrl: result.videoUrl }, 'Avatar clip ready')
        } catch (clipError) {
          const message = clipError instanceof Error ? clipError.message : String(clipError)
          await this.db.avatarClip.update({
            where: { id: clip.id },
            data: { status: ClipStatus.FAILED, errorMessage: message },
          })
          logger.error({ jobId, segmentIndex: index, error: message }, 'Avatar clip failed')
          // Continue with other clips even if one fails
        }
      }

      await this.db.mediaJob.update({
        where: { id: jobId },
        data: { status: MediaJobStatus.PENDING }, // reset to PENDING so broll can proceed
      })

      logger.info({ jobId }, 'Avatar clip generation phase complete')
      return this.findById(jobId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.db.mediaJob.update({
        where: { id: jobId },
        data: { status: MediaJobStatus.FAILED, errorMessage: message },
      })
      throw error
    }
  }

  // ── Fetch all B-roll (BROLL segments → Pexels) ────────────────────────

  async fetchBroll(jobId: string) {
    const job = await this.db.mediaJob.findUniqueOrThrow({ where: { id: jobId } })

    if (job.status === MediaJobStatus.FAILED) {
      throw new Error(`Cannot fetch B-roll: job is in FAILED status`)
    }

    await this.db.mediaJob.update({
      where: { id: jobId },
      data: { status: MediaJobStatus.BROLL_FETCHING },
    })

    const segments = job.segments as ScriptSegment[]
    const brollSegments = segments
      .map((seg, index) => ({ seg, index }))
      .filter(({ seg }) => seg.type === 'BROLL')

    logger.info({ jobId, brollSegments: brollSegments.length }, 'Fetching B-roll assets')

    for (const { seg, index } of brollSegments) {
      // Use visualSuggestion as search query, fallback to segment text keywords
      const searchQuery = seg.visualSuggestion ?? this.extractKeywords(seg.text)

      try {
        const video = await this.pexels.searchWithFallback(searchQuery)

        if (!video) {
          logger.warn({ jobId, segmentIndex: index, query: searchQuery }, 'No B-roll found, skipping')
          continue
        }

        await this.db.brollAsset.create({
          data: {
            jobId,
            segmentIndex: index,
            searchQuery,
            provider: 'PEXELS',
            externalId: String(video.id),
            videoUrl: video.videoUrl,
            previewUrl: video.previewUrl,
            width: video.width,
            height: video.height,
            durationSec: video.durationSec,
            photographer: video.photographer,
            startSec: seg.startSec,
            endSec: seg.endSec,
            visualSuggestion: seg.visualSuggestion,
          },
        })

        logger.info({ jobId, segmentIndex: index, videoId: video.id, query: searchQuery }, 'B-roll asset saved')
      } catch (err) {
        logger.error({ jobId, segmentIndex: index, error: err }, 'B-roll fetch failed for segment')
        // Non-fatal: continue with other segments
      }
    }

    await this.db.mediaJob.update({
      where: { id: jobId },
      data: { status: MediaJobStatus.ASSEMBLY_READY },
    })

    return this.findById(jobId)
  }

  // ── Generate assembly plan ───────────────────────────────────────────────

  async buildAssemblyPlan(jobId: string): Promise<VideoAssemblyPlan> {
    const job = await this.db.mediaJob.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        avatarClips: { orderBy: { segmentIndex: 'asc' } },
        brollAssets: { orderBy: { segmentIndex: 'asc' } },
      },
    })

    const segments = job.segments as ScriptSegment[]

    const clipMap = new Map(job.avatarClips.map((c) => [c.segmentIndex, c]))
    const brollMap = new Map(job.brollAssets.map((b) => [b.segmentIndex, b]))

    const timeline: AssemblyEntry[] = segments.map((seg, index) => {
      const clip = clipMap.get(index)
      const broll = brollMap.get(index)

      const base = {
        index,
        type: seg.type as AssemblyEntry['type'],
        startSec: seg.startSec,
        endSec: seg.endSec,
        durationSec: Math.round((seg.endSec - seg.startSec) * 10) / 10,
        text: seg.text,
        notes: seg.notes,
        visualDescription: seg.visualSuggestion,
        transition: (index === 0 ? 'cut' : 'fade') as 'cut' | 'fade',
      }

      if (seg.type === 'AVATAR' && clip?.videoUrl) {
        return { ...base, assetUrl: clip.videoUrl, audioUrl: clip.audioUrl ?? undefined }
      }

      if (seg.type === 'BROLL' && broll?.videoUrl) {
        return { ...base, assetUrl: broll.videoUrl }
      }

      return base
    })

    const totalDurationSec = Math.max(...segments.map((s) => s.endSec), 0)
    const isShort = job.contentFormat === 'SHORT_FUEL'

    const plan: VideoAssemblyPlan = {
      jobId,
      scriptId: job.scriptId,
      channelType: job.channelType as ChannelType,
      contentFormat: job.contentFormat as any,
      totalDurationSec,
      resolution: isShort ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
      timeline,
      editingNotes: [
        `Total segments: ${segments.length}`,
        `Avatar clips: ${job.avatarClips.filter((c) => c.status === 'READY').length}/${job.avatarClips.length}`,
        `B-roll assets: ${job.brollAssets.length}`,
        `Estimated duration: ${totalDurationSec}s`,
        isShort
          ? 'Format: 9:16 vertical (Shorts/Reels)'
          : 'Format: 16:9 horizontal (CTV-optimized, 1920x1080)',
        'Import each segment in order. Apply fade transitions between BROLL segments.',
        'AVATAR clips already have audio baked in via HeyGen.',
        'Add background music at -18dB under voice for BROLL segments.',
      ],
      ffmpegManifest: this.buildFfmpegManifest(timeline),
      generatedAt: new Date().toISOString(),
    }

    // Save plan and update job
    await this.storage.saveAssemblyPlan(plan, jobId)
    await this.db.mediaJob.update({
      where: { id: jobId },
      data: { assemblyPlan: plan as any, status: MediaJobStatus.COMPLETED, completedAt: new Date() },
    })

    logger.info({ jobId, totalDurationSec, segments: timeline.length }, 'Assembly plan built')
    return plan
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private buildFfmpegManifest(timeline: AssemblyEntry[]): string {
    const lines = timeline
      .filter((e) => e.assetUrl)
      .map((e) => `file '${e.assetUrl}' # [${e.startSec}s-${e.endSec}s] ${e.type} — ${e.text.slice(0, 60)}`)
    return lines.join('\n')
  }

  private extractKeywords(text: string): string {
    // Remove common stop words and return top 3 keywords for search
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'it', 'you', 'we', 'they', 'I'])
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
    return words.slice(0, 3).join(' ')
  }

  // ── Avatar profiles ───────────────────────────────────────────────────────

  async listAvatarProfiles(channelType?: string) {
    return this.db.avatarProfile.findMany({
      where: channelType ? { channelType: channelType as any } : undefined,
      orderBy: [{ isDefault: 'desc' }, { channelType: 'asc' }],
    })
  }

  async getDefaultAvatarProfile(channelType: string) {
    return this.db.avatarProfile.findFirst({
      where: { channelType: channelType as any, isDefault: true },
    })
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(filters: MediaJobFilters) {
    return this.db.mediaJob.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.channelType && { channelType: filters.channelType }),
      },
      include: {
        avatarProfile: true,
        avatarClips: { orderBy: { segmentIndex: 'asc' } },
        brollAssets: { orderBy: { segmentIndex: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters.offset ?? 0,
      take: filters.limit ?? 50,
    })
  }

  async findById(id: string) {
    return this.db.mediaJob.findUniqueOrThrow({
      where: { id },
      include: {
        avatarProfile: true,
        avatarClips: { orderBy: { segmentIndex: 'asc' } },
        brollAssets: { orderBy: { segmentIndex: 'asc' } },
      },
    })
  }

  async delete(id: string) {
    return this.db.mediaJob.delete({ where: { id } })
  }
}
