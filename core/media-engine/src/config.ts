import { z } from 'zod'
import 'dotenv/config'

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3004),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  BASE_URL: z.string().url().default('http://localhost:3004'),
  DATABASE_URL: z.string().url(),
  HEYGEN_API_KEY: z.string().min(1, 'HEYGEN_API_KEY is required'),
  HEYGEN_API_URL: z.string().url().default('https://api.heygen.com'),
  PEXELS_API_KEY: z.string().min(1, 'PEXELS_API_KEY is required'),
  PIXABAY_API_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads/media'),
  SCRIPT_ENGINE_URL: z.string().url().default('http://localhost:3002'),
  VOICE_ENGINE_URL: z.string().url().default('http://localhost:3003'),
  AVATAR_POLL_INTERVAL_MS: z.coerce.number().default(5000),
  AVATAR_POLL_TIMEOUT_MS: z.coerce.number().default(300000),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
