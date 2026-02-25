import Redis from 'ioredis';

let redis: Redis | null = null;
const STREAM_KEY = 'ai-pipeline:events';

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on('error', (e: Error) => console.warn('[Events] Redis error:', e.message));
  }
  return redis;
}

export async function publishEvent(
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const r = getRedis();
    await r.xadd(
      STREAM_KEY, '*',
      'type',      type,
      'payload',   JSON.stringify(payload),
      'timestamp', new Date().toISOString(),
      'source',    'thumbnail-engine'
    );
    console.log(`[Events] Published: ${type}`);
  } catch (e) {
    console.warn(`[Events] Failed to publish ${type}:`, (e as Error).message);
  }
}
