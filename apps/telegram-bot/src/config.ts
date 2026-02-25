import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWED_USER_ID: z
    .string()
    .transform(Number)
    .refine((n) => n > 0, 'Must be a valid Telegram user ID'),
  API_GATEWAY_URL: z.string().url().default('http://localhost:3100'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

export type Config = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('\u274c Invalid env config:', JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const config: Config = result.data;
