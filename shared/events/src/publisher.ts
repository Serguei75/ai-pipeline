import Redis from 'ioredis'
import { EventType, PipelineEvent } from './types'

const STREAM_KEY = 'ai-pipeline:events'
const MAX_LEN = 50_000 // keep last 50k events in stream

export class EventPublisher {
  private redis: Redis
  private serviceName: string

  constructor(serviceName: string, redisUrl?: string) {
    this.serviceName = serviceName
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    this.redis.on('error', (err) => console.error(`[EventBus] Redis error:`, err))
  }

  async connect(): Promise<void> {
    await this.redis.connect()
  }

  /**
   * Publish an event to the pipeline stream.
   * Returns the Redis stream message ID.
   */
  async publish<T = Record<string, unknown>>(
    type: EventType,
    payload: T,
    correlationId?: string,
  ): Promise<string> {
    const event: PipelineEvent<T> = {
      type,
      source: this.serviceName,
      correlationId,
      timestamp: new Date().toISOString(),
      payload,
    }

    const id = await this.redis.xadd(
      STREAM_KEY,
      'MAXLEN', '~', MAX_LEN,
      '*', // auto-generate ID
      'type', type,
      'source', this.serviceName,
      'correlationId', correlationId || '',
      'timestamp', event.timestamp,
      'payload', JSON.stringify(payload),
    )

    return id as string
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
