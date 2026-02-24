import { writeFile, mkdir, access, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { config } from '../config.js'
import { logger } from '../logger.js'

export class StorageService {
  private readonly uploadDir: string
  private readonly baseUrl: string

  constructor() {
    this.uploadDir = config.UPLOAD_DIR
    this.baseUrl = config.BASE_URL
  }

  async saveAudio(buffer: Buffer, filename: string): Promise<string> {
    const filePath = join(this.uploadDir, filename)
    const dir = dirname(filePath)

    await mkdir(dir, { recursive: true })
    await writeFile(filePath, buffer)

    const url = `${this.baseUrl}/audio/${filename}`
    logger.info({ filePath, sizeBytes: buffer.length, url }, 'Audio file saved')

    return url
  }

  async exists(filename: string): Promise<boolean> {
    try {
      await access(join(this.uploadDir, filename))
      return true
    } catch {
      return false
    }
  }

  async getFileSizeBytes(filename: string): Promise<number | null> {
    try {
      const stats = await stat(join(this.uploadDir, filename))
      return stats.size
    } catch {
      return null
    }
  }

  // In production: replace with S3 upload
  // async saveAudioToS3(buffer: Buffer, key: string): Promise<string>
}
