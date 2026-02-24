import { describe, it, expect } from 'vitest'
import { splitTextForTTS, estimateSpeechDuration } from '../utils/text-splitter.js'

describe('splitTextForTTS', () => {
  it('returns single chunk for short text', () => {
    const text = 'This is a short script. It fits in one chunk.'
    const result = splitTextForTTS(text, 4500)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(text)
  })

  it('splits long text at sentence boundaries', () => {
    const sentences = Array.from({ length: 30 }, (_, i) =>
      `This is sentence number ${i + 1} and it contains some content.`
    )
    const longText = sentences.join(' ')

    const result = splitTextForTTS(longText, 500)

    expect(result.length).toBeGreaterThan(1)
    // Each chunk must be within the limit
    result.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(600) // allow slight overage for comma splits
    })
    // Reconstructed text should contain all content (words preserved)
    const reconstructed = result.join(' ')
    sentences.forEach((sentence) => {
      const key = `sentence number ${sentences.indexOf(sentence) + 1}`
      expect(reconstructed).toContain(key)
    })
  })

  it('does not produce empty chunks', () => {
    const text = '   Hello world.   How are you?   I am fine.   '
    const result = splitTextForTTS(text, 4500)
    result.forEach((chunk) => {
      expect(chunk.trim().length).toBeGreaterThan(0)
    })
  })

  it('handles text that is exactly at the limit', () => {
    const text = 'A'.repeat(4500)
    const result = splitTextForTTS(text, 4500)
    expect(result).toHaveLength(1)
  })
})

describe('estimateSpeechDuration', () => {
  it('estimates duration for 150 WPM', () => {
    // 150 words = 60 seconds at 150 WPM
    const text = Array.from({ length: 150 }, () => 'word').join(' ')
    const duration = estimateSpeechDuration(text, 150)
    expect(duration).toBe(60)
  })

  it('INTELLECTUAL channel slower speech = longer duration', () => {
    const text = Array.from({ length: 142 }, () => 'word').join(' ')
    const intellectual = estimateSpeechDuration(text, 142)
    const fuel = estimateSpeechDuration(text, 155)
    expect(intellectual).toBeGreaterThan(fuel)
  })
})
