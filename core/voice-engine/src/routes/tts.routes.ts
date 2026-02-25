/**
 * TTS Routes
 *
 * POST /tts/generate         — create TTS job, returns jobId immediately
 * GET  /tts/jobs             — list jobs (with optional ?status= filter)
 * GET  /tts/jobs/:id         — get single job status + audio URL
 * POST /tts/jobs/:id/retry   — retry FAILED job
 * GET  /tts/voices           — list all ElevenLabs voices
 * POST /tts/preview          — instant preview (short text, no DB record)
 * GET  /tts/usage            — ElevenLabs character usage this month
 */

import { Router } from 'express'
import { TtsJobService }    from '../services/tts-job.service.js'
import type { JobStatus }   from '../services/tts-job.service.js'

const router = Router()

// Singleton service instance (shared across requests)
let svc: TtsJobService
function getService(): TtsJobService {
  if (!svc) svc = new TtsJobService()
  return svc
}

// ── POST /tts/generate ──────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { scriptText, voiceId, model, stability, similarityBoost, style } = req.body as {
      scriptText?: string
      voiceId?: string
      model?: string
      stability?: number
      similarityBoost?: number
      style?: number
    }
    if (!scriptText?.trim()) {
      return res.status(400).json({ error: 'scriptText is required' })
    }
    const job = await getService().createJob({ scriptText, voiceId, model: model as any, stability, similarityBoost, style })
    return res.status(202).json({ jobId: job.id, status: job.status, message: 'Job enqueued' })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── GET /tts/jobs ──────────────────────────────────────────────────────
router.get('/jobs', (req, res) => {
  try {
    const status = req.query['status'] as JobStatus | undefined
    const limit  = req.query['limit'] ? parseInt(String(req.query['limit'])) : 20
    const jobs = getService().listJobs({ status, limit })
    return res.json({ jobs, count: jobs.length })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── GET /tts/jobs/:id ──────────────────────────────────────────────────
router.get('/jobs/:id', (req, res) => {
  try {
    const job = getService().getJob(req.params['id']!)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    return res.json(job)
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── POST /tts/jobs/:id/retry ────────────────────────────────────────────
router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const job = await getService().retryJob(req.params['id']!)
    return res.json(job)
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── GET /tts/voices ───────────────────────────────────────────────────────
router.get('/voices', async (_req, res) => {
  try {
    const voices = await getService().listVoices()
    return res.json({ voices })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── POST /tts/preview ────────────────────────────────────────────────────
router.post('/preview', async (req, res) => {
  try {
    const { text, voiceId } = req.body as { text?: string; voiceId?: string }
    if (!text || !voiceId) return res.status(400).json({ error: 'text and voiceId are required' })
    const buffer = await getService().generatePreview(text, voiceId)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Disposition', 'inline; filename="preview.mp3"')
    return res.send(buffer)
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ── GET /tts/usage ────────────────────────────────────────────────────────
router.get('/usage', async (_req, res) => {
  try {
    const usage = await getService().getUsage()
    return res.json(usage)
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

export default router
