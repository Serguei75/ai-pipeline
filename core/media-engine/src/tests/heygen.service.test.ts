import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HeyGenService } from '../services/heygen.service.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('HeyGenService', () => {
  let service: HeyGenService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HeyGenService()
  })

  describe('createVideo()', () => {
    it('returns video_id on successful creation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 100,
          data: { video_id: 'heygen-video-abc123' },
        }),
      })

      const videoId = await service.createVideo({
        avatarId: 'Tyler-incasualsuit-20220721',
        avatarStyle: 'normal',
        backgroundColor: '#111827',
        audioUrl: 'http://localhost:3003/audio/job-1-en.mp3',
      })

      expect(videoId).toBe('heygen-video-abc123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/video/generate'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('throws on HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      await expect(
        service.createVideo({
          avatarId: 'Tyler',
          avatarStyle: 'normal',
          backgroundColor: '#000',
          audioUrl: 'http://test.com/audio.mp3',
        })
      ).rejects.toThrow('401')
    })

    it('throws if HeyGen returns code != 100', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 400,
          message: 'Invalid avatar_id',
          data: {},
        }),
      })

      await expect(
        service.createVideo({
          avatarId: 'invalid-avatar',
          avatarStyle: 'normal',
          backgroundColor: '#000',
          audioUrl: 'http://test.com/audio.mp3',
        })
      ).rejects.toThrow('Invalid avatar_id')
    })
  })

  describe('getVideoStatus()', () => {
    it('returns completed status with videoUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 100,
          data: {
            status: 'completed',
            video_url: 'https://files.heygen.ai/video/abc123.mp4',
            thumbnail_url: 'https://files.heygen.ai/thumb/abc123.jpg',
          },
        }),
      })

      const result = await service.getVideoStatus('heygen-video-abc123')

      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe('https://files.heygen.ai/video/abc123.mp4')
      expect(result.thumbnailUrl).toBe('https://files.heygen.ai/thumb/abc123.jpg')
    })

    it('returns failed status with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 100,
          data: {
            status: 'failed',
            error: { code: 'AUDIO_ERROR', detail: 'Audio file not accessible' },
          },
        }),
      })

      const result = await service.getVideoStatus('heygen-video-xyz')
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBe('Audio file not accessible')
    })
  })
})
