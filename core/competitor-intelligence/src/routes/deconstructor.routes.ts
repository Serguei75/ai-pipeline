/**
 * Deconstructor Routes
 * POST /deconstructor/analyze     — full video deconstruction (URL → 10 dimensions)
 * POST /deconstructor/transcribe  — YouTube URL → timestamped transcript only
 * POST /deconstructor/benchmark   — score our hook vs competitor analysis JSON
 */

import { Router } from 'express'
import { DeconstructorService } from '../services/deconstructor.service.js'
import { TubescribeService }    from '../services/tubescribe.service.js'
import { BenchmarkerService }   from '../services/benchmarker.service.js'

const router = Router()

// ── POST /deconstructor/analyze ──────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const { videoUrl } = req.body as { videoUrl?: string }
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

    const svc = new DeconstructorService(apiKey)
    const result = await svc.deconstructFromUrl(videoUrl)
    return res.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
})

// ── POST /deconstructor/transcribe ───────────────────────────────────────────
router.post('/transcribe', async (req, res) => {
  try {
    const { videoUrl, lang = 'en' } = req.body as { videoUrl?: string; lang?: string }
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' })

    const svc = new TubescribeService()
    const result = await svc.transcribe(videoUrl, lang)
    return res.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
})

// ── POST /deconstructor/benchmark ────────────────────────────────────────────
router.post('/benchmark', async (req, res) => {
  try {
    const { ourHook, competitorAnalysis } = req.body as {
      ourHook?: string
      competitorAnalysis?: { topHooks: unknown[]; scriptTemplate: unknown }
    }
    if (!ourHook || !competitorAnalysis) {
      return res.status(400).json({ error: 'ourHook and competitorAnalysis are required' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

    const svc = new BenchmarkerService(apiKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await svc.benchmark(ourHook, competitorAnalysis as any)
    return res.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
})

export default router
