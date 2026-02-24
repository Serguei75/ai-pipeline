import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaService } from '../services/media.service.js'
import { ChannelType, ContentFormat, MediaJobStatus } from '../types.js'

const mockDb = {
  mediaJob: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  avatarProfile: {
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  avatarClip: {
    create: vi.fn(),
    update: vi.fn(),
  },
  brollAsset: {
    create: vi.fn(),
  },
}

const mockHeygen = {
  createVideo: vi.fn(),
  getVideoStatus: vi.fn(),
  waitForCompletion: vi.fn(),
  listAvatars: vi.fn(),
}

const mockPexels = {
  searchVideos: vi.fn(),
  searchWithFallback: vi.fn(),
}

const mockStorage = {
  saveFile: vi.fn(),
  saveAssemblyPlan: vi.fn(),
}

const MOCK_SEGMENTS = [
  { type: 'AVATAR', startSec: 0, endSec: 8, text: 'AI just replaced 40% of advisors.', avatarPlan: 'STUDIO' },
  { type: 'BROLL', startSec: 8, endSec: 20, text: 'But the data tells a different story.', visualSuggestion: 'financial charts and graphs' },
  { type: 'AVATAR', startSec: 20, endSec: 45, text: "Here's what this means for your money.", avatarPlan: 'CLOSEUP' },
]

describe('MediaService', () => {
  let mediaService: MediaService

  beforeEach(() => {
    vi.clearAllMocks()
    mediaService = new MediaService(mockDb as any, mockHeygen as any, mockPexels as any, mockStorage as any)
  })

  describe('createJob()', () => {
    it('creates media job with segments in PENDING status', async () => {
      mockDb.mediaJob.findUnique.mockResolvedValue(null)
      mockDb.avatarProfile.findUniqueOrThrow.mockResolvedValue({ id: 'profile-1' })
      mockDb.mediaJob.create.mockResolvedValue({
        id: 'media-job-1',
        scriptId: 'script-1',
        status: MediaJobStatus.PENDING,
      })

      await mediaService.createJob({
        scriptId: 'script-1',
        channelType: ChannelType.INTELLECTUAL,
        contentFormat: ContentFormat.DEEP_ESSAY,
        avatarProfileId: 'profile-1',
        segments: MOCK_SEGMENTS as any,
      })

      expect(mockDb.mediaJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MediaJobStatus.PENDING }),
        })
      )
    })

    it('throws Conflict if media job already exists for scriptId', async () => {
      mockDb.mediaJob.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        mediaService.createJob({
          scriptId: 'script-1',
          channelType: ChannelType.FUEL,
          contentFormat: ContentFormat.SHORT_FUEL,
          segments: MOCK_SEGMENTS as any,
        })
      ).rejects.toThrow('already exists')
    })
  })

  describe('generateAvatarClips()', () => {
    it('throws if job is not in PENDING status', async () => {
      mockDb.mediaJob.findUniqueOrThrow.mockResolvedValue({
        id: 'media-job-1',
        status: MediaJobStatus.COMPLETED,
        avatarProfile: { heygenAvatarId: 'Tyler' },
      })

      await expect(mediaService.generateAvatarClips('media-job-1')).rejects.toThrow('PENDING')
    })

    it('throws if no avatar profile assigned', async () => {
      mockDb.mediaJob.findUniqueOrThrow.mockResolvedValue({
        id: 'media-job-1',
        status: MediaJobStatus.PENDING,
        avatarProfile: null,
        segments: MOCK_SEGMENTS,
      })
      mockDb.mediaJob.update.mockResolvedValue({})

      await expect(mediaService.generateAvatarClips('media-job-1')).rejects.toThrow('avatar profile')
    })
  })

  describe('fetchBroll()', () => {
    it('throws if job is in FAILED status', async () => {
      mockDb.mediaJob.findUniqueOrThrow.mockResolvedValue({
        id: 'media-job-1',
        status: MediaJobStatus.FAILED,
      })

      await expect(mediaService.fetchBroll('media-job-1')).rejects.toThrow('FAILED')
    })

    it('fetches Pexels B-roll for all BROLL segments', async () => {
      mockDb.mediaJob.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: 'media-job-1',
          status: MediaJobStatus.PENDING,
          segments: MOCK_SEGMENTS,
        })
        .mockResolvedValueOnce({ // findById at end
          id: 'media-job-1',
          status: MediaJobStatus.ASSEMBLY_READY,
          avatarClips: [],
          brollAssets: [{ segmentIndex: 1 }],
          avatarProfile: null,
        })

      mockDb.mediaJob.update.mockResolvedValue({})
      mockPexels.searchWithFallback.mockResolvedValue({
        id: 4815162,
        videoUrl: 'https://hd.mp4',
        previewUrl: 'https://thumb.jpg',
        width: 1920, height: 1080,
        durationSec: 15,
        photographer: 'Test',
      })
      mockDb.brollAsset.create.mockResolvedValue({ id: 'broll-1' })

      await mediaService.fetchBroll('media-job-1')

      // Only 1 BROLL segment in MOCK_SEGMENTS
      expect(mockPexels.searchWithFallback).toHaveBeenCalledTimes(1)
      expect(mockPexels.searchWithFallback).toHaveBeenCalledWith('financial charts and graphs')
      expect(mockDb.brollAsset.create).toHaveBeenCalledTimes(1)
    })
  })
})
