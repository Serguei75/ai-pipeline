/**
 * TtsJobService — Async TTS Job Queue
 *
 * High-level orchestrator:
 *   script text → ElevenLabs TTS → audio.mp3 on disk → DB job record
 *
 * Job lifecycle: PENDING → PROCESSING → DONE | FAILED
 * Audio files saved to: AUDIO_OUTPUT_DIR (env, default ./output/audio)
 */

import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { ElevenLabsService, MODELS, type ModelId, type TtsOptions } from './elevenlabs.service.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface TtsJob {
  id: string
  status: JobStatus
  scriptText: string
  voiceId: string
  model: ModelId
  stability: number
  similarityBoost: number
  audioPath: string | null      // absolute path once DONE
  audioUrl: string | null       // public URL once DONE
  characterCount: number | null
  durationSeconds: number | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerateVoiceoverInput {
  scriptText: string
  voiceId?: string              // defaults to ELEVENLABS_DEFAULT_VOICE_ID
  model?: ModelId
  stability?: number            // 0-1, default 0.5
  similarityBoost?: number      // 0-1, default 0.75
  style?: number                // 0-1, default 0.0
}

// ─── In-memory store (replace with Prisma in production) ────────────────────────
// TODO: swap jobStore for Prisma VoiceJob model when schema is ready

const jobStore = new Map<string, TtsJob>()

// ─── Service ─────────────────────────────────────────────────────────────────

export class TtsJobService {
  private el: ElevenLabsService
  private outputDir: string
  private publicBaseUrl: string

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY env var is required')
    this.el = new ElevenLabsService(apiKey)
    this.outputDir = process.env.AUDIO_OUTPUT_DIR ?? path.resolve('./output/audio')
    this.publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3003}`
    fs.mkdirSync(this.outputDir, { recursive: true })
  }

  // ── Create & enqueue a new TTS job ────────────────────────────────────────

  async createJob(input: GenerateVoiceoverInput): Promise<TtsJob> {
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL' // "Bella"

    const job: TtsJob = {
      id:              randomUUID(),
      status:          'PENDING',
      scriptText:      input.scriptText,
      voiceId:         input.voiceId ?? defaultVoiceId,
      model:           input.model ?? MODELS.MULTILINGUAL,
      stability:       input.stability       ?? 0.5,
      similarityBoost: input.similarityBoost ?? 0.75,
      audioPath:       null,
      audioUrl:        null,
      characterCount:  null,
      durationSeconds: null,
      errorMessage:    null,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    }

    jobStore.set(job.id, job)

    // Fire-and-forget — process in background
    this.processJob(job.id).catch((err) => {
      console.error(`[TtsJobService] Job ${job.id} failed:`, err)
    })

    return job
  }

  // ── Process a job (internal) ──────────────────────────────────────────────

  private async processJob(jobId: string): Promise<void> {
    const job = jobStore.get(jobId)
    if (!job) return

    this.update(jobId, { status: 'PROCESSING' })

    try {
      const opts: TtsOptions = {
        voiceId:         job.voiceId,
        text:            job.scriptText,
        model:           job.model,
        stability:       job.stability,
        similarityBoost: job.similarityBoost,
      }

      const result = await this.el.generateTts(opts)

      const filename  = `${jobId}.mp3`
      const audioPath = path.join(this.outputDir, filename)
      await this.el.saveAudio(result.audioBuffer, audioPath)

      const audioUrl = `${this.publicBaseUrl}/audio/${filename}`

      this.update(jobId, {
        status:          'DONE',
        audioPath,
        audioUrl,
        characterCount:  result.characterCount,
        durationSeconds: this.estimateDuration(result.characterCount),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.update(jobId, { status: 'FAILED', errorMessage: msg })
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
    if (!job) throw new Error(`Job ${id} not found`)
    if (job.status !== 'FAILED') throw new Error(`Job ${id} is not in FAILED state`)
    this.update(id, { status: 'PENDING', errorMessage: null })
    this.processJob(id).catch(console.error)
    return jobStore.get(id)!
  }

  // ── Delegate to ElevenLabs ────────────────────────────────────────────────

  listVoices()                                  { return this.el.listVoices() }
  generatePreview(text: string, voiceId: string){ return this.el.generatePreview(text, voiceId) }
  getUsage()                                    { return this.el.getUsage() }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private update(id: string, patch: Partial<TtsJob>) {
    const job = jobStore.get(id)
    if (!job) return
    Object.assign(job, patch, { updatedAt: new Date().toISOString() })
  }

  // ~150 characters per second for natural speech
  private estimateDuration(chars: number | null): number | null {
    if (!chars) return null
    return Math.round(chars / 150)
  }
}
