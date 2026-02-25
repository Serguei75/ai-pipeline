export { EventPublisher } from './publisher'
export { EventConsumer } from './consumer'
export * from './types'

export const STREAM_KEY = 'ai-pipeline:events'

/**
 * Usage example (in any microservice):
 *
 * import { EventPublisher, EventConsumer } from '@ai-pipeline/events'
 *
 * // Publish
 * const publisher = new EventPublisher('topic-engine')
 * await publisher.publish('topic.approved', {
 *   topicId: '123',
 *   title: 'How to Invest in ETFs',
 *   channelType: 'INTELLECTUAL',
 *   ...
 * })
 *
 * // Consume (e.g. in Script Engine)
 * const consumer = new EventConsumer('script-engine-group', 'script-engine-1')
 * consumer.on('topic.approved', async (event) => {
 *   // Auto-trigger script generation when topic is approved
 *   await scriptService.generateForTopic(event.payload.topicId)
 * })
 * await consumer.start()
 */
