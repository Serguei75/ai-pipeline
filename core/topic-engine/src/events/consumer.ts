/**
 * Topic Engine — Event Bus Consumer
 *
 * Listens for:
 *   analytics.niche_underperforming  → reduce niche CPM score
 *   community.topic_exported          → auto-create topic from community question
 */
import {
  EventConsumer,
  AnalyticsNicheUnderperformingPayload,
} from '@ai-pipeline/events'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function startTopicEngineConsumer(): void {
  const consumer = new EventConsumer(
    'topic-engine-group',
    'topic-engine-1',
    process.env.REDIS_URL,
  )

  // ───────────────────────────────────────────────────────────────
  // EVENT: analytics.niche_underperforming
  // When actual RPM < 60% of expected CPM → mark niche as low-performing
  // Topic Engine will de-prioritize this niche in scoring
  // ───────────────────────────────────────────────────────────────
  consumer.on<AnalyticsNicheUnderperformingPayload>(
    'analytics.niche_underperforming',
    async (event) => {
      const { niche, channelType, actualRPM, expectedCPM, ratio } = event.payload
      console.log(
        `[TopicEngine] → niche_underperforming: ${niche}/${channelType} ` +
        `actualRPM=$${actualRPM.toFixed(2)} expectedCPM=$${expectedCPM.toFixed(2)} ratio=${ratio.toFixed(2)}`,
      )

      // Reduce cpmScore for affected niche in pending topics
      // Penalty: proportional to underperformance (max 30% reduction)
      const penaltyFactor = Math.min(0.3, (1 - ratio) * 0.5)

      await prisma.topic.updateMany({
        where: {
          niche,
          channelType: channelType as 'FUEL' | 'INTELLECTUAL',
          status: 'PENDING',
        },
        data: {
          performancePenalty: penaltyFactor,
          penaltyReason: `niche_underperforming: actualRPM=$${actualRPM.toFixed(2)}, ratio=${ratio.toFixed(2)}`,
        },
      }).catch(console.error)
    },
  )

  // ───────────────────────────────────────────────────────────────
  // EVENT: community.topic_exported
  // Community Engine found a recurring viewer question → auto-create topic
  // ───────────────────────────────────────────────────────────────
  consumer.on<{ question: string; channelType: string; frequency: number }>(
    'community.topic_exported',
    async (event) => {
      const { question, channelType, frequency } = event.payload
      console.log(`[TopicEngine] → community question (x${frequency}): "${question}"`)

      await prisma.topic.create({
        data: {
          title: question,
          channelType: (channelType ?? 'INTELLECTUAL') as 'FUEL' | 'INTELLECTUAL',
          status: 'PENDING',
          source: 'COMMUNITY',
          communityFrequency: frequency,
        },
      }).catch(console.error)
    },
  )

  consumer.start()
  console.log('[Topic Engine] 📡 Event consumer started')
}
