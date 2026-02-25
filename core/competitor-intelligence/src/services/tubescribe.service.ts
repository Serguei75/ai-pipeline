/**
 * TubescribeService — YouTube Video Transcription
 *
 * Integrates OpenClaw skill: matusvojtek/tubescribe
 * YouTube URL → full transcript with timestamps
 *
 * Used as a preprocessor for DeconstructorService.
 */

import { YoutubeTranscript, type TranscriptResponse } from 'youtube-transcript'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimedSegment {
  text: string
  offset: number   // ms from start
  duration: number // ms
}

export interface TranscriptResult {
  videoId: string
  videoUrl: string
  fullText: string
  segments: TimedSegment[]
  language: string
  durationSeconds: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractVideoId(input: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const re of patterns) {
    const m = input.match(re)
    if (m) return m[1]
  }
  throw new Error(`Cannot extract video ID from: ${input}`)
}

function cleanText(raw: string): string {
  return raw
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TubescribeService {
  /**
   * Fetch and parse YouTube transcript.
   * Falls back to first available language if `lang` not found.
   */
  async transcribe(videoUrl: string, lang = 'en'): Promise<TranscriptResult> {
    const videoId = extractVideoId(videoUrl)

    let raw: TranscriptResponse[]
    try {
      raw = await YoutubeTranscript.fetchTranscript(videoId, { lang })
    } catch {
      raw = await YoutubeTranscript.fetchTranscript(videoId)
    }

    if (!raw?.length) {
      throw new Error(`No transcript available for video: ${videoId}`)
    }

    const segments: TimedSegment[] = raw.map((s) => ({
      text: cleanText(s.text),
      offset: s.offset,
      duration: s.duration,
    }))

    const last = segments[segments.length - 1]
    const durationSeconds = Math.ceil((last.offset + last.duration) / 1_000)

    return {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      fullText: segments.map((s) => s.text).join(' '),
      segments,
      language: lang,
      durationSeconds,
    }
  }

  /**
   * Format transcript for Gemini prompt:
   * Groups segments into ~30-second chunks with [M:SS] timestamps.
   */
  formatForAnalysis(result: TranscriptResult): string {
    const CHUNK_MS = 30_000
    const out: string[] = []
    let buf = ''
    let chunkStart = 0

    for (const seg of result.segments) {
      if (seg.offset - chunkStart >= CHUNK_MS && buf) {
        out.push(`[${this.ms2ts(chunkStart)}] ${buf.trim()}`)
        buf = ''
        chunkStart = seg.offset
      }
      buf += seg.text + ' '
    }
    if (buf.trim()) out.push(`[${this.ms2ts(chunkStart)}] ${buf.trim()}`)

    return out.join('\n')
  }

  private ms2ts(ms: number): string {
    const s = Math.floor(ms / 1_000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
}
