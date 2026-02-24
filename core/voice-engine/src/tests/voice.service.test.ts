import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceService } from '../services/voice.service.js'
import { ChannelType, ContentFormat, VoiceJobStatus } from '../types.js'

const mockDb = {
  voiceProfile: {
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  voiceJob: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  audioFile: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}

const mockElevenLabs = {
  textToSpeech: vi.fn(),
  getVoices: vi.fn(),
  getSubscriptionInfo: vi.fn(),
}

const mockStorage = {
  saveAudio: vi.fn(),
  exists: vi.fn(),
  getFileSizeBytes: vi.fn(),
}

const MOCK_PROFILE = {
  id: 'profile-1',
  elevenLabsVoiceId: 'TxGEqnHWrfWFTfGW9XjX',
  stability: 0.65,
  similarityBoost: 0.75,
  style: 0.5,
  speakerBoost: true,
  speed: 1.0,
  channelType: 'FUEL',
}

describe('VoiceService', () => {
  let voiceService: VoiceService

  beforeEach(() => {
    vi.clearAllMocks()
    voiceService = new VoiceService(mockDb as any, mockElevenLabs as any, mockStorage as any)
  })

  describe('createJob()', () => {
    it('creates a voice job with PENDING status', async () => {
      mockDb.voiceProfile.findUniqueOrThrow.mockResolvedValue(MOCK_PROFILE)
      mockDb.voiceJob.findUnique.mockResolvedValue(null)
      mockDb.voiceJob.create.mockResolvedValue({
        id: 'job-1',
        scriptId: 'script-1',
        status: VoiceJobStatus.PENDING,
      })

      const result = await voiceService.createJob({
        scriptId: 'script-1',
        channelType: ChannelType.FUEL,
        contentFormat: ContentFormat.SHORT_FUEL,
        voiceProfileId: 'profile-1',
        scriptText: 'This is a short fuel script.',
        languages: ['en'],
      })

      expect(mockDb.voiceJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: VoiceJobStatus.PENDING }),
        })
      )
    })

    it('throws Conflict if job already exists for scriptId', async () => {
      mockDb.voiceProfile.findUniqueOrThrow.mockResolvedValue(MOCK_PROFILE)
      mockDb.voiceJob.findUnique.mockResolvedValue({ id: 'existing-job' })

      await expect(
        voiceService.createJob({
          scriptId: 'script-1',
          channelType: ChannelType.FUEL,
          contentFormat: ContentFormat.SHORT_FUEL,
          voiceProfileId: 'profile-1',
          scriptText: 'Test script.',
        })
      ).rejects.toThrow('already exists')
    })
  })

  describe('generateAudio()', () => {
    it('throws if job is not in PENDING status', async () => {
      mockDb.voiceJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: VoiceJobStatus.COMPLETED,
        voiceProfile: MOCK_PROFILE,
      })

      await expect(voiceService.generateAudio('job-1')).rejects.toThrow('PENDING')
    })

    it('generates audio, saves file, updates status to COMPLETED', async () => {
      const mockAudioBuffer = Buffer.from('fake-mp3-data')

      mockDb.voiceJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: VoiceJobStatus.PENDING,
        scriptText: 'Hello world. This is a test script.',
        channelType: 'FUEL',
        voiceProfile: MOCK_PROFILE,
      })
      mockDb.voiceJob.update.mockResolvedValue({ id: 'job-1', status: VoiceJobStatus.COMPLETED })
      mockElevenLabs.textToSpeech.mockResolvedValue(mockAudioBuffer)
      mockStorage.saveAudio.mockResolvedValue('http://localhost:3003/audio/job-1-en.mp3')
      mockDb.audioFile.create.mockResolvedValue({ id: 'audio-1', language: 'en' })

      // findById call at the end
      mockDb.voiceJob.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'job-1',
        status: VoiceJobStatus.PENDING,
        scriptText: 'Hello world. This is a test script.',
        channelType: 'FUEL',
        voiceProfile: MOCK_PROFILE,
      }).mockResolvedValueOnce({
        id: 'job-1',
        status: VoiceJobStatus.COMPLETED,
        audioFiles: [{ language: 'en', isMain: true }],
        voiceProfile: MOCK_PROFILE,
      })

      await voiceService.generateAudio('job-1')

      expect(mockElevenLabs.textToSpeech).toHaveBeenCalledOnce()
      expect(mockStorage.saveAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        'job-1-en.mp3'
      )
      expect(mockDb.audioFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ language: 'en', isMain: true }),
        })
      )
    })

    it('sets status to FAILED and rethrows on ElevenLabs error', async () => {
      mockDb.voiceJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: VoiceJobStatus.PENDING,
        scriptText: 'Test.',
        channelType: 'FUEL',
        voiceProfile: MOCK_PROFILE,
      })
      mockDb.voiceJob.update.mockResolvedValue({})
      mockElevenLabs.textToSpeech.mockRejectedValue(new Error('ElevenLabs API error [429]: Rate limit exceeded'))

      await expect(voiceService.generateAudio('job-1')).rejects.toThrow('Rate limit')

      expect(mockDb.voiceJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: VoiceJobStatus.FAILED }),
        })
      )
    })
  })

  describe('generateLocalizations()', () => {
    it('throws if job is not COMPLETED', async () => {
      mockDb.voiceJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: VoiceJobStatus.PROCESSING,
        voiceProfile: MOCK_PROFILE,
      })

      await expect(
        voiceService.generateLocalizations('job-1', {
          languages: ['de'],
          translatedTexts: { de: 'Hallo Welt.' },
        })
      ).rejects.toThrow('COMPLETED')
    })
  })
})
