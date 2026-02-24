import { writeFile, mkdir } from 'fs/promises'
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

  async saveFile(buffer: Buffer, filename: string, subfolder = ''): Promise<string> {
    const dir = subfolder ? join(this.uploadDir, subfolder) : this.uploadDir
    await mkdir(dir, { recursive: true })

    const filePath = join(dir, filename)
    await writeFile(filePath, buffer)

    const urlPath = subfolder ? `/media/${subfolder}/${filename}` : `/media/${filename}`
    const url = `${this.baseUrl}${urlPath}`
    logger.info({ filePath, sizeBytes: buffer.length, url }, 'File saved')
    return url
  }

  async saveAssemblyPlan(plan: object, jobId: string): Promise<string> {
    const json = JSON.stringify(plan, null, 2)
    const buffer = Buffer.from(json, 'utf-8')
    return this.saveFile(buffer, `${jobId}-assembly.json`, 'plans')
  }
}
