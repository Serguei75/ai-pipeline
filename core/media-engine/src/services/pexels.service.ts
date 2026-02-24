// Pexels Service — B-roll Stock Footage
// API: https://www.pexels.com/api/documentation/#videos-search
// Free tier: 200 req/hour, 20,000 req/month

import { config } from '../config.js'
import { logger } from '../logger.js'
import type { PexelsVideo } from '../types.js'

interface PexelsVideoFile {
  link: string
  quality: string
  width: number
  height: number
}

interface PexelsRawVideo {
  id: number
  url: string
  image: string
  duration: number
  user: { name: string }
  video_files: PexelsVideoFile[]
}

interface PexelsSearchResponse {
  videos: PexelsRawVideo[]
  total_results: number
}

export class PexelsService {
  private readonly baseUrl = 'https://api.pexels.com'
  private readonly apiKey: string

  constructor() {
    this.apiKey = config.PEXELS_API_KEY
  }

  private get headers(): Record<string, string> {
    return { Authorization: this.apiKey }
  }

  async searchVideos(query: string, perPage = 5): Promise<PexelsVideo[]> {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation: 'landscape',
      size: 'large',   // large = 1920px minimum width
    })

    logger.debug({ query, perPage }, 'Pexels: searching B-roll')

    const response = await fetch(
      `${this.baseUrl}/videos/search?${params.toString()}`,
      { headers: this.headers },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pexels API error [${response.status}]: ${errorText}`)
    }

    const data = await response.json() as PexelsSearchResponse

    if (!data.videos || data.videos.length === 0) {
      logger.warn({ query }, 'Pexels: no results found for query')
      return []
    }

    const results = data.videos.map((video) => this.parseVideo(video))

    logger.info({ query, found: results.length }, 'Pexels: B-roll found')
    return results
  }

  // Pick best available video file (prefer HD 1920x1080)
  private pickBestFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
    // Priority: hd at 1920 > hd at any > sd
    const sorted = [...files].sort((a, b) => {
      if (a.quality === 'hd' && b.quality !== 'hd') return -1
      if (b.quality === 'hd' && a.quality !== 'hd') return 1
      return (b.width ?? 0) - (a.width ?? 0)
    })
    return sorted[0] ?? null
  }

  private parseVideo(raw: PexelsRawVideo): PexelsVideo {
    const bestFile = this.pickBestFile(raw.video_files)
    return {
      id: raw.id,
      url: raw.url,
      videoUrl: bestFile?.link ?? '',
      previewUrl: raw.image,
      width: bestFile?.width ?? 1920,
      height: bestFile?.height ?? 1080,
      durationSec: raw.duration,
      photographer: raw.user?.name ?? 'Unknown',
    }
  }

  // Search with fallback — if main query yields no results, try simplified query
  async searchWithFallback(query: string): Promise<PexelsVideo | null> {
    let results = await this.searchVideos(query, 3)

    if (results.length === 0) {
      // Fallback: use first 2 words of query
      const fallbackQuery = query.split(' ').slice(0, 2).join(' ')
      logger.info({ original: query, fallback: fallbackQuery }, 'Pexels: using fallback query')
      results = await this.searchVideos(fallbackQuery, 3)
    }

    return results[0] ?? null
  }
}
