/**
 * Community Engine — Event Bus Publisher
 *
 * Publishes:
 *   community.comments_synced  → after YouTube comment sync
 *   community.topic_exported   → when recurring question is exported to Topic Engine
 *   community.draft_approved   → when a reply draft is approved and sent
 */
import { EventPublisher } from '@ai-pipeline/events'

let publisher: EventPublisher | null = null

function getPublisher(): EventPublisher {
  if (!publisher) {
    publisher = new EventPublisher('community-engine', process.env.REDIS_URL)
  }
  return publisher
}

export async function publishCommentsSynced(
  videoYoutubeId: string,
  count: number,
): Promise<void> {
  await getPublisher().publish('community.comments_synced', {
    videoYoutubeId,
    count,
  })
}

export async function publishTopicExported(
  questionId: string,
  question: string,
  channelType: string,
  frequency: number,
): Promise<void> {
  console.log(`[Community] → Exporting question to Topic Engine: "${question}" (x${frequency})`)
  await getPublisher().publish('community.topic_exported', {
    questionId,
    question,
    channelType,
    frequency,
  })
}

export async function publishDraftApproved(
  draftId: string,
  commentId: string,
  replyText: string,
): Promise<void> {
  await getPublisher().publish('community.draft_approved', {
    draftId,
    commentId,
    replyText,
  })
}
