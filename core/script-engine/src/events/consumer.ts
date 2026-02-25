/**
 * Script Engine — Event Bus Consumer
 *
 * Listens for:
 *   topic.approved          → auto-trigger script generation
 *   analytics.hook_weak     → flag script for hook revision
 */
import { EventConsumer, TopicApprovedPayload, AnalyticsHookWeakPayload } from '@ai-pipeline/events'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function startScriptEngineConsumer(): void {
  const consumer = new EventConsumer(
    'script-engine-group',
    'script-engine-1',
    process.env.REDIS_URL,
  )

  // ───────────────────────────────────────────────────────────────
  // EVENT: topic.approved → auto-generate script
  // ───────────────────────────────────────────────────────────────
  consumer.on<TopicApprovedPayload>('topic.approved', async (event) => {
    const { topicId, channelType, title } = event.payload
    console.log(`[ScriptEngine] → topic.approved: "${title}" (${channelType})`)

    // Mark topic as pending script in DB
    // In production: call ScriptService.generateForTopic()
    await prisma.script.create({
      data: {
        topicId,
        channelType,
        status: 'PENDING_GENERATION',
        triggeredBy: 'event:topic.approved',
        title: `[AUTO] ${title}`,
      },
    }).catch((err) => {
      console.error('[ScriptEngine] Failed to create pending script:', err)
    })
  })

  // ───────────────────────────────────────────────────────────────
  // EVENT: analytics.hook_weak → flag script for hook revision
  // Triggers when retention_8s < threshold (default 40%)
  // ───────────────────────────────────────────────────────────────
  consumer.on<AnalyticsHookWeakPayload>('analytics.hook_weak', async (event) => {
    const { scriptId, retention8s, threshold } = event.payload
    if (!scriptId) return

    console.log(
      `[ScriptEngine] → analytics.hook_weak: script=${scriptId} retention=${retention8s}% (threshold: ${threshold}%)`,
    )

    await prisma.script.updateMany({
      where: { id: scriptId },
      data: {
        needsHookRevision: true,
        hookRevisionReason: `retention_8s=${retention8s}% below threshold ${threshold}%`,
      },
    }).catch(console.error)
  })

  consumer.start()
  console.log('[Script Engine] 📡 Event consumer started')
}
