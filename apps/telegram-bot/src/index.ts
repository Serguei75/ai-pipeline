import { bot } from './bot.js';
import { NotificationConsumer } from './services/event-consumer.js';
import { logger } from './logger.js';
import { config } from './config.js';

const consumer = new NotificationConsumer();

async function main(): Promise<void> {
  logger.info({ env: config.NODE_ENV }, 'Starting AI Pipeline Telegram Bot');

  // Start Event Bus consumer (push notifications)
  await consumer.start().catch((err) => {
    logger.warn({ err }, 'Event consumer failed to start — Redis may be unavailable, push notifications disabled');
  });

  // Start long-polling
  await bot.start({
    onStart: (info) =>
      logger.info({ username: info.username }, `Bot @${info.username} is running`),
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});

const shutdown = async (): Promise<void> => {
  logger.info('Graceful shutdown...');
  await consumer.stop();
  await bot.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
