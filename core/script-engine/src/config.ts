import { z } from 'zod'
import * as dotenv from 'dotenv'

dotenv.config()

const ConfigSchema = z.object({
  PORT:               z.string().default('3002').transform(Number),
  NODE_ENV:           z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL:       z.string().min(1, 'DATABASE_URL is required'),
  OPENAI_API_KEY:     z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL:       z.string().default('gpt-4o'),
  OPENAI_MAX_TOKENS:  z.string().default('6000').transform(Number),
  OPENAI_TEMPERATURE: z.string().default('0.7').transform(Number),
  TOPIC_ENGINE_URL:   z.string().default('http://localhost:3001'),
})

const parsed = ConfigSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
