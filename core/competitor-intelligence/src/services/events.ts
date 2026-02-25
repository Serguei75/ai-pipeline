import Redis from 'ioredis'
import { config } from '../config'

const STREAM_KEY = 'ai-pipeline:events'

export class EventPublisher {
  private redis: Redis
  private connected = false

  constructor() {
    this.redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      lazyConnect: true,
    })
  }

  async connect() {
    try {
      await this.redis.connect()
      this.connected = true
      console.log('✅ Event Bus connected')
    } catch (e) {
      console.warn('⚠️  Event Bus unavailable:', (e as Error).message)
    }
  }

  async publish(type: string, payload: Record<string, unknown>) {
    if (!this.connected) return
    try {
      await this.redis.xadd(
        STREAM_KEY, '*',
        'type', type,
        'payload', JSON.stringify(payload),
      )
    } catch (e) {
      console.error('Event publish error:', (e as Error).message)
    }
  }

  disconnect() { this.redis.disconnect() }
}
