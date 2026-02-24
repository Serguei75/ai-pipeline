// HeyGen Service — Avatar Video Generation
// API: https://docs.heygen.com/reference/create-video-v2
// Flow: POST create → poll GET status → return download URL

import { config } from '../config.js'
import { logger } from '../logger.js'
import type { HeyGenVideoResult } from '../types.js'

interface CreateVideoParams {
  avatarId: string
  avatarStyle: string
  backgroundColor: string
  audioUrl: string        // voice engine audio file URL
  width?: number
  height?: number
}

interface HeyGenCreateResponse {
  code: number
  data: { video_id: string }
  message?: string
}

interface HeyGenStatusResponse {
  code: number
  data: {
    status: 'processing' | 'completed' | 'failed'
    video_url?: string
    video_url_caption?: string
    thumbnail_url?: string
    error?: { code: string; detail: string }
  }
}

export class HeyGenService {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor() {
    this.baseUrl = config.HEYGEN_API_URL
    this.apiKey = config.HEYGEN_API_KEY
  }

  private get headers(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  async createVideo(params: CreateVideoParams): Promise<string> {
    const body = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: params.avatarId,
            avatar_style: params.avatarStyle,
          },
          voice: {
            type: 'audio',
            audio_url: params.audioUrl,
          },
          background: {
            type: 'color',
            value: params.backgroundColor,
          },
        },
      ],
      dimension: {
        width: params.width ?? 1920,
        height: params.height ?? 1080,
      },
      test: config.NODE_ENV !== 'production', // free test renders in non-prod
    }

    logger.debug({ avatarId: params.avatarId }, 'HeyGen: creating avatar video')

    const response = await fetch(`${this.baseUrl}/v2/video/generate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HeyGen create video failed [${response.status}]: ${errorText}`)
    }

    const data = await response.json() as HeyGenCreateResponse

    if (data.code !== 100 || !data.data?.video_id) {
      throw new Error(`HeyGen API error: ${data.message ?? 'Unknown error'}`)
    }

    logger.info({ videoId: data.data.video_id }, 'HeyGen: video job created')
    return data.data.video_id
  }

  async getVideoStatus(videoId: string): Promise<HeyGenVideoResult> {
    const response = await fetch(
      `${this.baseUrl}/v1/video_status.get?video_id=${videoId}`,
      { headers: this.headers },
    )

    if (!response.ok) {
      throw new Error(`HeyGen status check failed [${response.status}]`)
    }

    const data = await response.json() as HeyGenStatusResponse

    return {
      videoId,
      status: data.data.status,
      videoUrl: data.data.video_url,
      thumbnailUrl: data.data.thumbnail_url,
      errorMessage: data.data.error?.detail,
    }
  }

  // Poll until completed or timeout
  async waitForCompletion(videoId: string): Promise<HeyGenVideoResult> {
    const startTime = Date.now()
    const timeout = config.AVATAR_POLL_TIMEOUT_MS
    const interval = config.AVATAR_POLL_INTERVAL_MS

    logger.info({ videoId }, 'HeyGen: polling for completion')

    while (Date.now() - startTime < timeout) {
      const result = await this.getVideoStatus(videoId)

      if (result.status === 'completed') {
        logger.info({ videoId, videoUrl: result.videoUrl }, 'HeyGen: video completed')
        return result
      }

      if (result.status === 'failed') {
        throw new Error(`HeyGen video failed: ${result.errorMessage ?? 'Unknown error'}`)
      }

      logger.debug({ videoId, elapsed: Date.now() - startTime }, 'HeyGen: still processing, waiting...')
      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(`HeyGen video ${videoId} timed out after ${timeout}ms`)
  }

  async listAvatars(): Promise<Array<{ avatar_id: string; avatar_name: string; preview_url: string }>> {
    const response = await fetch(`${this.baseUrl}/v2/avatars`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch HeyGen avatars: ${response.status}`)
    }

    const data = await response.json() as { data: { avatars: Array<{ avatar_id: string; avatar_name: string; preview_url: string }> } }
    return data.data.avatars
  }
}
