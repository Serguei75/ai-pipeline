import type { PrismaClient } from '@prisma/client'
import type { ElevenLabsService } from './elevenlabs.service.js'
import type { StorageService } from './storage.service.js'
import { splitTextForTTS, estimateSpeechDuration } from '../utils/text-splitter.js'
import {
  VoiceJobStatus,
  type CreateVoiceJobDTO,
  type LocalizeJobDTO,
  type VoiceJobFilters,
  type YouTubeMultiAudioPackage,
} from '../types.js'
import { logger } from '../logger.js'
import { config } from '../config.js'

export class VoiceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly elevenlabs: ElevenLabsService,
    private readonly storage: StorageService,
  ) {}

  // ── Create job record ────────────────────────────────────────────────────

  async createJob(dto: CreateVoiceJobDTO) {
    // Validate voice profile exists
    await this.db.voiceProfile.findUniqueOrThrow({ where: { id: dto.voiceProfileId } })

    const existing = await this.db.voiceJob.findUnique({ where: { scriptId: dto.scriptId } })
    if (existing) {
      throw new Error(`Voice job for script ${dto.scriptId} already exists (id: ${existing.id})`)
    }

    return this.db.voiceJob.create({
      data: {
        scriptId: dto.scriptId,
        channelType: dto.channelType,
        contentFormat: dto.contentFormat,
        voiceProfileId: dto.voiceProfileId,
        scriptText: dto.scriptText,
        languages: dto.languages ?? ['en'],
        status: VoiceJobStatus.PENDING,
      },
      include: { voiceProfile: true, audioFiles: true },
    })
  }

  // ── Generate primary EN audio ─────────────────────────────────────────────

  async generateAudio(jobId: string) {
    const job = await this.db.voiceJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { voiceProfile: true },
    })

    if (job.status !== VoiceJobStatus.PENDING) {
      throw new Error(`Cannot generate audio: job is in status "${job.status}", expected PENDING`)
    }

    await this.db.voiceJob.update({
      where: { id: jobId },
      data: { status: VoiceJobStatus.PROCESSING, startedAt: new Date() },
    })

    try {
      const chunks = splitTextForTTS(job.scriptText, config.MAX_CHARS_PER_CHUNK)
      logger.info({ jobId, totalChunks: chunks.length, scriptLength: job.scriptText.length }, 'Starting EN audio generation')

      const audioBuffers: Buffer[] = []
      for (let i = 0; i < chunks.length; i++) {
        logger.debug({ jobId, chunk: i + 1, of: chunks.length, chars: chunks[i].length }, 'Generating chunk')
        const buffer = await this.elevenlabs.textToSpeech({
          voiceId: job.voiceProfile.elevenLabsVoiceId,
          text: chunks[i],
          stability: job.voiceProfile.stability,
          similarityBoost: job.voiceProfile.similarityBoost,
          style: job.voiceProfile.style,
          speakerBoost: job.voiceProfile.speakerBoost,
          speed: job.voiceProfile.speed,
        })
        audioBuffers.push(buffer)
      }

      // Concatenate all chunks into single MP3
      const finalBuffer = Buffer.concat(audioBuffers)
      const filename = `${jobId}-en.mp3`
      const url = await this.storage.saveAudio(finalBuffer, filename)

      const durationSec = estimateSpeechDuration(
        job.scriptText,
        job.channelType === 'INTELLECTUAL' ? 142 : 155,
      )

      await this.db.audioFile.create({
        data: {
          jobId,
          language: 'en',
          url,
          format: 'MP3',
          sizeBytes: finalBuffer.length,
          durationSec,
          chunks: chunks.length,
          isMain: true,
          youtubeTrackLabel: 'English (Original)',
        },
      })

      await this.db.voiceJob.update({
        where: { id: jobId },
        data: {
          status: VoiceJobStatus.COMPLETED,
          totalChunks: chunks.length,
          completedAt: new Date(),
        },
      })

      logger.info({ jobId, sizeBytes: finalBuffer.length, durationSec }, 'EN audio generation complete')

      return this.findById(jobId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.db.voiceJob.update({
        where: { id: jobId },
        data: { status: VoiceJobStatus.FAILED, errorMessage: message },
      })
      logger.error({ jobId, error: message }, 'Audio generation failed')
      throw error
    }
  }

  // ── Generate localized audio tracks ────────────────────────────────────────
  // Research: YouTube Multi-Audio = one video, multiple languages
  // → doesn't split views across duplicates, increases total watch time
  // → one video gains "weight" from all language audiences

  async generateLocalizations(jobId: string, dto: LocalizeJobDTO) {
    const job = await this.db.voiceJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { voiceProfile: true },
    })

    if (job.status !== VoiceJobStatus.COMPLETED) {
      throw new Error(`Cannot localize: job is in status "${job.status}", expected COMPLETED`)
    }

    const LANGUAGE_LABELS: Record<string, string> = {
      de: 'German',
      es: 'Spanish',
      ja: 'Japanese',
      fr: 'French',
      pt: 'Portuguese',
      it: 'Italian',
      ko: 'Korean',
      zh: 'Chinese',
    }

    const results: Array<{ language: string; url: string }> = []

    for (const lang of dto.languages) {
      const translatedText = dto.translatedTexts[lang]
      if (!translatedText) {
        logger.warn({ jobId, lang }, `No translated text provided for language ${lang}, skipping`)
        continue
      }

      // Check if already generated
      const existing = await this.db.audioFile.findUnique({
        where: { jobId_language: { jobId, language: lang } },
      })
      if (existing) {
        logger.info({ jobId, lang }, 'Audio file already exists, skipping')
        results.push({ language: lang, url: existing.url })
        continue
      }

      logger.info({ jobId, lang, textLength: translatedText.length }, 'Generating localized audio')

      // Use same voice profile (multilingual model handles pronunciation)
      const chunks = splitTextForTTS(translatedText, config.MAX_CHARS_PER_CHUNK)
      const audioBuffers: Buffer[] = []

      for (const chunk of chunks) {
        const buffer = await this.elevenlabs.textToSpeech({
          voiceId: job.voiceProfile.elevenLabsVoiceId,
          text: chunk,
          model: 'eleven_multilingual_v2',
          stability: job.voiceProfile.stability,
          similarityBoost: job.voiceProfile.similarityBoost,
          style: job.voiceProfile.style,
          speakerBoost: job.voiceProfile.speakerBoost,
        })
        audioBuffers.push(buffer)
      }

      const finalBuffer = Buffer.concat(audioBuffers)
      const filename = `${jobId}-${lang}.mp3`
      const url = await this.storage.saveAudio(finalBuffer, filename)

      const durationSec = estimateSpeechDuration(translatedText)

      await this.db.audioFile.create({
        data: {
          jobId,
          language: lang,
          url,
          format: 'MP3',
          sizeBytes: finalBuffer.length,
          durationSec,
          chunks: chunks.length,
          isMain: false,
          youtubeTrackLabel: LANGUAGE_LABELS[lang] ?? lang.toUpperCase(),
        },
      })

      results.push({ language: lang, url })
      logger.info({ jobId, lang, sizeBytes: finalBuffer.length }, 'Localized audio saved')
    }

    return this.findById(jobId)
  }

  // ── YouTube Multi-Audio package ──────────────────────────────────────────

  async packageForYouTube(jobId: string): Promise<YouTubeMultiAudioPackage> {
    const job = await this.db.voiceJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { audioFiles: { orderBy: { isMain: 'desc' } } },
    })

    if (job.audioFiles.length === 0) {
      throw new Error('No audio files generated yet. Run /generate first.')
    }

    return {
      jobId,
      scriptId: job.scriptId,
      audioTracks: job.audioFiles.map((f) => ({
        language: f.language,
        url: f.url,
        isMain: f.isMain,
        youtubeTrackLabel: f.youtubeTrackLabel,
        durationSec: f.durationSec,
        sizeBytes: f.sizeBytes,
      })),
      totalTracks: job.audioFiles.length,
      uploadInstructions: [
        'YouTube Studio > Select video > Editor > Audio > Audio tracks',
        'Upload each .mp3 file as a separate language track.',
        'Mark the EN track as the original (default).',
        'One video → multiple language tracks = no view fragmentation across duplicates.',
      ].join('\n'),
    }
  }

  // ── Voice profiles ───────────────────────────────────────────────────────────

  async listProfiles(channelType?: string) {
    return this.db.voiceProfile.findMany({
      where: channelType ? { channelType: channelType as any } : undefined,
      orderBy: [{ isDefault: 'desc' }, { channelType: 'asc' }, { language: 'asc' }],
    })
  }

  async getDefaultProfile(channelType: string) {
    return this.db.voiceProfile.findFirst({
      where: { channelType: channelType as any, isDefault: true },
    })
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(filters: VoiceJobFilters) {
    return this.db.voiceJob.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.channelType && { channelType: filters.channelType }),
      },
      include: { voiceProfile: true, audioFiles: { orderBy: { isMain: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      skip: filters.offset ?? 0,
      take: filters.limit ?? 50,
    })
  }

  async findById(id: string) {
    return this.db.voiceJob.findUniqueOrThrow({
      where: { id },
      include: { voiceProfile: true, audioFiles: { orderBy: { isMain: 'desc' } } },
    })
  }

  async delete(id: string) {
    return this.db.voiceJob.delete({ where: { id } })
  }
}
