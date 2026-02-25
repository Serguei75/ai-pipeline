import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Storage Service for thumbnails.
 * In development: saves to ./storage/thumbnails/ locally.
 * In production: uploads to GCS / S3 via STORAGE_BUCKET config.
 * (Cloud upload stub — replace with @google-cloud/storage or @aws-sdk/client-s3 in prod)
 */
export class StorageService {
  private readonly baseDir = './storage';

  async uploadBase64(base64: string, path: string): Promise<string> {
    if (config.NODE_ENV === 'development') {
      return this.saveLocally(base64, path);
    }
    // TODO: swap for cloud storage in prod
    return this.saveLocally(base64, path);
  }

  private saveLocally(base64: string, path: string): string {
    const fullPath = join(this.baseDir, path);
    mkdirSync(dirname(fullPath), { recursive: true });

    const buffer = Buffer.from(base64, 'base64');
    const ws = createWriteStream(fullPath);
    ws.write(buffer);
    ws.end();

    logger.info({ path: fullPath }, 'Thumbnail saved locally');
    return fullPath;
  }

  getPublicUrl(storagePath: string): string {
    if (config.STORAGE_BASE_URL) {
      return `${config.STORAGE_BASE_URL}/${storagePath.replace('./storage/', '')}`;
    }
    return storagePath;
  }
}
