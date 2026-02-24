import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PexelsService } from '../services/pexels.service.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_PEXELS_RESPONSE = {
  videos: [
    {
      id: 4815162,
      url: 'https://www.pexels.com/video/4815162/',
      image: 'https://images.pexels.com/videos/4815162/thumb.jpg',
      duration: 15,
      user: { name: 'John Doe' },
      video_files: [
        { link: 'https://player.vimeo.com/external/hd.mp4', quality: 'hd', width: 1920, height: 1080 },
        { link: 'https://player.vimeo.com/external/sd.mp4', quality: 'sd', width: 640, height: 360 },
      ],
    },
  ],
  total_results: 1,
}

describe('PexelsService', () => {
  let service: PexelsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PexelsService()
  })

  describe('searchVideos()', () => {
    it('returns parsed video list with HD url selected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_PEXELS_RESPONSE,
      })

      const results = await service.searchVideos('financial advisor office', 5)

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(4815162)
      expect(results[0].videoUrl).toBe('https://player.vimeo.com/external/hd.mp4')
      expect(results[0].width).toBe(1920)
      expect(results[0].durationSec).toBe(15)
    })

    it('returns empty array when no results found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ videos: [], total_results: 0 }),
      })

      const results = await service.searchVideos('very obscure search query xyz')
      expect(results).toHaveLength(0)
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      })

      await expect(service.searchVideos('test')).rejects.toThrow('403')
    })

    it('prefers HD quality over SD', async () => {
      const responseWithMixedQuality = {
        videos: [{
          id: 999,
          url: 'https://pexels.com',
          image: 'https://img.jpg',
          duration: 10,
          user: { name: 'Test' },
          video_files: [
            { link: 'https://sd.mp4', quality: 'sd', width: 640, height: 360 },
            { link: 'https://hd.mp4', quality: 'hd', width: 1920, height: 1080 },
          ],
        }],
        total_results: 1,
      }

      mockFetch.mockResolvedValue({ ok: true, json: async () => responseWithMixedQuality })
      const results = await service.searchVideos('test')
      expect(results[0].videoUrl).toBe('https://hd.mp4')
    })
  })

  describe('searchWithFallback()', () => {
    it('uses fallback query when main query returns no results', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ videos: [], total_results: 0 }) }) // first call: empty
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_PEXELS_RESPONSE }) // fallback: has results

      const result = await service.searchWithFallback('financial advisor talking to client 2026')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(4815162)
    })
  })
})
