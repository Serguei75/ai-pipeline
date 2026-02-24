import { z } from 'zod'
import 'dotenv/config'

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3003),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  BASE_URL: z.string().url().default('http://localhost:3003'),
  DATABASE_URL: z.string().url(),
  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_MODEL: z.string().default('eleven_multilingual_v2'),
  UPLOAD_DIR: z.string().default('./uploads/audio'),
  MAX_CHARS_PER_CHUNK: z.coerce.number().min(500).max(5000).default(4500),
  SCRIPT_ENGINE_URL: z.string().url().default('http://localhost:3002'),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
