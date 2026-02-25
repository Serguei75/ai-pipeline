import Redis from 'ioredis'
import { EventType, PipelineEvent } from './types'

const STREAM_KEY = 'ai-pipeline:events'

type Handler<T = Record<string, unknown>> = (event: PipelineEvent<T>) => Promise<void>

export class EventConsumer {
  private redis: Redis
  private handlers = new Map<EventType, Handler[]>()
  private running = false

  constructor(
    private readonly groupName: string,  // e.g. 'script-engine-group'
    private readonly consumerName: string, // e.g. 'script-engine-1'
    redisUrl?: string,
  ) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // allow infinite retries for blocking reads
    })
    this.redis.on('error', (err) => console.error(`[EventBus Consumer ${groupName}] Redis error:`, err))
  }

  /**
   * Register a handler for a specific event type.
   * Multiple handlers can be registered for the same type.
   */
  on<T = Record<string, unknown>>(type: EventType, handler: Handler<T>): this {
    const existing = this.handlers.get(type) ?? []
    existing.push(handler as Handler)
    this.handlers.set(type, existing)
    return this
  }

  /**
   * Start consuming events. Creates consumer group if it doesn't exist.
   * Only processes events of registered types.
   */
  async start(): Promise<void> {
    // Create consumer group (start from '$' = only new events)
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, this.groupName, '$', 'MKSTREAM')
    } catch {
      // BUSYGROUP error = group already exists, that's fine
    }

    this.running = true
    console.log(`[EventBus] Consumer '${this.groupName}' started, listening for: [${Array.from(this.handlers.keys()).join(', ')}]`)
    this.poll().catch((err) => console.error('[EventBus] Poll crashed:', err))
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        // Blocking read — waits up to 5s for new messages
        const results = (await this.redis.xreadgroup(
          'GROUP', this.groupName, this.consumerName,
          'COUNT', '10',
          'BLOCK', '5000',
          'STREAMS', STREAM_KEY, '>',
        )) as [string, [string, string[]][]][] | null

        if (!results) continue // timeout, loop again

        for (const [, messages] of results) {
          for (const [msgId, fields] of messages) {
            const event = this.parseMessage(msgId, fields)
            if (!event) {
              await this.redis.xack(STREAM_KEY, this.groupName, msgId)
              continue
            }

            const handlers = this.handlers.get(event.type) ?? []
            for (const handler of handlers) {
              try {
                await handler(event)
              } catch (err) {
                console.error(`[EventBus] Handler error for '${event.type}' (msg ${msgId}):`, err)
              }
            }

            // ACK: message processed (even if handlers errored — prevents redelivery loops)
            await this.redis.xack(STREAM_KEY, this.groupName, msgId)
          }
        }
      } catch (err) {
        if (this.running) {
          console.error('[EventBus] Poll error:', err)
          await sleep(1000) // back off before retry
        }
      }
    }
  }

  private parseMessage(id: string, fields: string[]): PipelineEvent | null {
    try {
      const obj: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1]
      }
      return {
        id,
        type: obj.type as EventType,
        source: obj.source,
        correlationId: obj.correlationId || undefined,
        timestamp: obj.timestamp,
        payload: JSON.parse(obj.payload || '{}'),
      }
    } catch {
      return null
    }
  }

  async stop(): Promise<void> {
    this.running = false
    await this.redis.quit()
    console.log(`[EventBus] Consumer '${this.groupName}' stopped`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
