/**
 * Analytics Engine — Event Bus Publisher
 *
 * Publishes:
 *   analytics.video_synced          → every time YouTube data is refreshed
 *   analytics.hook_weak             → when retention_8s < HOOK_THRESHOLD
 *   analytics.niche_underperforming → when actualRPM < expectedCPM * RPM_RATIO
 */
import {
  EventPublisher,
  AnalyticsVideoSyncedPayload,
  AnalyticsHookWeakPayload,
  AnalyticsNicheUnderperformingPayload,
} from '@ai-pipeline/events'

const HOOK_THRESHOLD = parseFloat(process.env.HOOK_RETENTION_THRESHOLD || '40')
const RPM_RATIO = parseFloat(process.env.NICHE_RPM_RATIO || '0.6')

let publisher: EventPublisher | null = null

function getPublisher(): EventPublisher {
  if (!publisher) {
    publisher = new EventPublisher('analytics-engine', process.env.REDIS_URL)
  }
  return publisher
}

export async function publishVideoSynced(
  video: AnalyticsVideoSyncedPayload,
): Promise<void> {
  await getPublisher().publish('analytics.video_synced', video)

  // Automatically check for hook weakness
  if (video.retention8s < HOOK_THRESHOLD) {
    await publishHookWeak({
      videoId: video.videoId,
      retention8s: video.retention8s,
      threshold: HOOK_THRESHOLD,
      niche: 'unknown', // enriched by caller if available
    })
  }
}

export async function publishHookWeak(
  data: Omit<AnalyticsHookWeakPayload, 'scriptId'> & { scriptId?: string },
): Promise<void> {
  console.log(
    `[Analytics] 🚨 Weak hook detected: retention_8s=${data.retention8s}% ` +
    `(threshold: ${data.threshold}%) → publishing analytics.hook_weak`,
  )
  await getPublisher().publish('analytics.hook_weak', data)
}

export async function publishNicheUnderperforming(
  data: AnalyticsNicheUnderperformingPayload,
): Promise<void> {
  if (data.ratio < RPM_RATIO) {
    console.log(
      `[Analytics] 🚨 Niche underperforming: ${data.niche}/${data.channelType} ` +
      `RPM=$${data.actualRPM.toFixed(2)} expected=$${data.expectedCPM.toFixed(2)} ` +
      `→ publishing analytics.niche_underperforming`,
    )
    await getPublisher().publish('analytics.niche_underperforming', data)
  }
}
