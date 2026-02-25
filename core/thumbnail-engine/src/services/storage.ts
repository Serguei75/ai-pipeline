import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage/thumbnails');
const BASE_URL = process.env.STORAGE_BASE_URL || 'http://localhost:3009/static';

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
}

export async function saveImage(
  jobId: string,
  buffer: Buffer
): Promise<{ localPath: string; imageUrl: string }> {
  await ensureStorageDir();
  const filename = `${jobId}.png`;
  const localPath = path.join(STORAGE_PATH, filename);
  await fs.writeFile(localPath, buffer);
  const imageUrl = `${BASE_URL}/${filename}`;
  return { localPath, imageUrl };
}

export async function deleteImage(localPath: string): Promise<void> {
  try {
    await fs.unlink(localPath);
  } catch {
    // Файл может не существовать
  }
}
