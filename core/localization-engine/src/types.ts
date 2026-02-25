export type LocalizationMode = 'SUBTITLES' | 'DUBBING' | 'BOTH'
export type TaskStatus = 'PENDING' | 'STAGE1_PROCESSING' | 'STAGE1_DONE' | 'STAGE2_PROCESSING' | 'COMPLETED' | 'FAILED'
export type AssetType = 'SUBTITLES' | 'AUDIO' | 'METADATA'
export type AssetStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface CreateTaskDto {
  youtubeVideoId: string
  title: string
  sourceLang?: string
  targetLangs: string[]  // e.g. ["de", "es", "ja"]
  mode?: LocalizationMode
  scriptText?: string
  durationSeconds?: number
}

export interface TranslateResult {
  language: string
  translatedText: string
}

export interface MetadataResult {
  language: string
  title: string
  description: string
  tags: string[]
}

export interface SrtEntry {
  index: number
  start: string  // "00:00:01,000"
  end: string    // "00:00:04,500"
  text: string
}

export interface LocalizationPackage {
  taskId: string
  youtubeVideoId: string
  languages: string[]
  assets: {
    language: string
    subtitlePath?: string
    audioPath?: string
    metadata?: MetadataResult
  }[]
}
