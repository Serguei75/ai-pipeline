// Text splitter for TTS API
// ElevenLabs accepts max ~5000 chars per request
// We split at sentence boundaries to preserve natural speech rhythm

/**
 * Splits long text into TTS-compatible chunks.
 * Splits at sentence boundaries (. ! ?) preserving complete sentences.
 * Falls back to comma splits for very long single sentences.
 */
export function splitTextForTTS(text: string, maxChars = 4500): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxChars) {
    return [normalized]
  }

  // Match complete sentences including trailing whitespace
  const sentences = normalized.match(/[^.!?]+[.!?]+\s*/g) ?? [normalized]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      // Single sentence too long — split at commas
      if (current.trim()) {
        chunks.push(current.trim())
        current = ''
      }
      const parts = sentence.split(/,\s+/)
      for (const part of parts) {
        if ((current + ', ' + part).length > maxChars) {
          if (current.trim()) chunks.push(current.trim())
          current = part
        } else {
          current = current ? `${current}, ${part}` : part
        }
      }
    } else if ((current + sentence).length > maxChars) {
      if (current.trim()) chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks.filter((c) => c.length > 0)
}

/**
 * Estimates speech duration in seconds based on word count.
 * Average speaking rate: 140-160 WPM (we use 150 as baseline).
 * INTELLECTUAL channel uses slower rate (0.95x speed) → adjust accordingly.
 */
export function estimateSpeechDuration(
  text: string,
  wordsPerMinute = 150,
): number {
  const wordCount = text.trim().split(/\s+/).length
  return Math.round((wordCount / wordsPerMinute) * 60)
}
