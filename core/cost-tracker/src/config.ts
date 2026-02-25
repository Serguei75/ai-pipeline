import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3010'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ai_pipeline'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Cost Tracker config error:', JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const config = result.data;
