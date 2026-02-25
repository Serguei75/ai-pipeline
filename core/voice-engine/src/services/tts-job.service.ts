/**
 * TtsJobService — Async TTS Job Queue
 *
 * Orchestrates:
 *   script text → TtsRouter.select(opts) → provider.generate() → audio file → DB record
 *
 * Job lifecycle: PENDING → PROCESSING → DONE | FAILED
 * Audio files saved to: AUDIO_OUTPUT_DIR (env, default ./output/audio)
 *
 * Provider routing:
 *   clone=true  → ResembleProvider ($5-19/mo, voice cloning)
 *   mode='dev'  → KokoroProvider   ($0, HuggingFace)
 *   default     → PollyProvider    (~$2-5/mo, Amazon Neural)
 */

import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { TtsRouter }  from '../providers/tts-router.js'
import type { RoutingOpts, RoutingMode, QualityTier } from '../providers/tts-provider.interface.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface TtsJob {
  id: string
  status: JobStatus
  scriptText: string
  voiceId: string | null
  mode: RoutingMode
  quality: QualityTier
  clone: boolean
  provider: string | null       // which provider was selected
  audioPath: string | null      // absolute path once DONE
  audioUrl: string | null       // public URL once DONE
  characterCount: number | null
  durationSeconds: number | null
  estimatedCostUsd: number | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerateVoiceoverInput {
  scriptText: string
  voiceId?: string
  mode?: RoutingMode          // 'dev' | 'prod' | 'clone' (default: 'prod')
  quality?: QualityTier       // 'free' | 'economy' | 'standard' | 'premium'
  clone?: boolean             // true = use ResembleProvider for voice cloning
}

// ─── In-memory store (replace with Prisma VoiceJob model when schema is ready) ──────

const jobStore = new Map<string, TtsJob>()

// ─── Service ─────────────────────────────────────────────────────────────────

export class TtsJobService {
  private router       = new TtsRouter()
  private outputDir:   string
  private publicBase:  string

  constructor() {
    this.outputDir  = process.env.AUDIO_OUTPUT_DIR ?? path.resolve('./output/audio')
    this.publicBase = process.env.PUBLIC_BASE_URL  ?? `http://localhost:${process.env.PORT ?? 3003}`
    fs.mkdirSync(this.outputDir, { recursive: true })
  }

  // ── Create & enqueue ─────────────────────────────────────────────────────────

  async createJob(input: GenerateVoiceoverInput): Promise<TtsJob> {
    const mode    = input.mode    ?? 'prod'
    const quality = input.quality ?? 'economy'
    const clone   = input.clone   ?? false

    const job: TtsJob = {
      id:               randomUUID(),
      status:           'PENDING',
      scriptText:       input.scriptText,
      voiceId:          input.voiceId ?? null,
      mode,
      quality,
      clone,
      provider:         null,
      audioPath:        null,
      audioUrl:         null,
      characterCount:   null,
      durationSeconds:  null,
      estimatedCostUsd: null,
      errorMessage:     null,
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    }

    jobStore.set(job.id, job)

    // Fire-and-forget background processing
    this.processJob(job.id).catch((err) =>
      console.error(`[TtsJobService] Job ${job.id} failed:`, err)
    )

    return job
  }

  // ── Process (internal) ─────────────────────────────────────────────────────

  private async processJob(jobId: string): Promise<void> {
    const job = jobStore.get(jobId)
    if (!job) return

    this.patch(jobId, { status: 'PROCESSING' })

    try {
      const routingOpts: RoutingOpts = {
        mode:    job.mode,
        quality: job.quality,
        clone:   job.clone,
      }

      const provider = this.router.select(routingOpts)
      this.patch(jobId, { provider: provider.name })

      const result = await provider.generate(job.scriptText, {
        voiceId: job.voiceId ?? undefined,
      })

      const ext      = result.contentType.includes('wav') ? 'wav' : 'mp3'
      const filename = `${jobId}.${ext}`
      const audioPath = path.join(this.outputDir, filename)

      // Write buffer to disk via stream pipeline
      await pipeline(
        Readable.from(result.audioBuffer),
        createWriteStream(audioPath)
      )

      const audioUrl = `${this.publicBase}/audio/${filename}`

      this.patch(jobId, {
        status:           'DONE',
        audioPath,
        audioUrl,
        characterCount:   result.characterCount,
        durationSeconds:  this.estimateDuration(result.characterCount),
        estimatedCostUsd: result.estimatedCostUsd,
      })
    } catch (err: unknown) {
      this.patch(jobId, {
        status:       'FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Job queries ───────────────────────────────────────────────────────────

  getJob(id: string): TtsJob | null {
    return jobStore.get(id) ?? null
  }

  listJobs(filter?: { status?: JobStatus; limit?: number }): TtsJob[] {
    let jobs = Array.from(jobStore.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filter?.status) jobs = jobs.filter((j) => j.status === filter.status)
    if (filter?.limit)  jobs = jobs.slice(0, filter.limit)
    return jobs
  }

  async retryJob(id: string): Promise<TtsJob> {
    const job = jobStore.get(id)
    if (!job)                   throw new Error(`Job ${id} not found`)
    if (job.status !== 'FAILED') throw new Error(`Job ${id} is not in FAILED state (current: ${job.status})`)
    this.patch(id, { status: 'PENDING', errorMessage: null, provider: null })
    this.processJob(id).catch(console.error)
    return jobStore.get(id)!
  }

  // ── Delegate to providers ────────────────────────────────────────────────

  async listVoices(opts?: RoutingOpts) {
    if (opts) {
      // List voices for specific provider
      return this.router.select(opts).listVoices()
    }
    // Aggregate all providers
    const results = await Promise.allSettled(this.router.all().map((p) => p.listVoices()))
    return results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof this.router.kokoro.listVoices>>> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
  }

  async generatePreview(text: string, voiceId: string, opts?: RoutingOpts) {
    const provider = this.router.select(opts ?? { mode: 'prod' })
    const result   = await provider.generate(text.slice(0, 200), { voiceId })
    return result.audioBuffer
  }

  estimateCost(charsPerMonth: number, opts?: RoutingOpts) {
    return this.router.estimateMonthlyCost(charsPerMonth, opts ?? {})
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private patch(id: string, patch: Partial<TtsJob>) {
    const job = jobStore.get(id)
    if (!job) return
    Object.assign(job, patch, { updatedAt: new Date().toISOString() })
  }

  private estimateDuration(chars: number | null): number | null {
    if (!chars) return null
    return Math.round(chars / 150)  // ~150 chars/second natural speech
  }
}
