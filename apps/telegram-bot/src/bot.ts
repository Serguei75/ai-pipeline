import { Bot } from 'grammy';
import { config } from './config.js';
import { logger } from './logger.js';
import { TopicsHandler } from './handlers/topics.handler.js';
import { ScriptsHandler } from './handlers/scripts.handler.js';
import { StatsHandler } from './handlers/stats.handler.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Auth middleware — only the configured user ID can interact
bot.use(async (ctx, next) => {
  if (ctx.from?.id !== config.TELEGRAM_ALLOWED_USER_ID) {
    await ctx.reply('⛔ Доступ запрещён.');
    return;
  }
  await next();
});

const topicsHandler = new TopicsHandler();
const scriptsHandler = new ScriptsHandler();
const statsHandler = new StatsHandler();

// ---- Commands ----
bot.command('start', async (ctx) => {
  await ctx.reply(
    '🎬 *AI Pipeline Bot*\n\n' +
      'Управляй пайплайном прямо из Telegram:\n\n' +
      '📋 /topics — Темы на одобрение\n' +
      '📝 /scripts — Скрипты на ревью\n' +
      '📊 /stats — Статистика системы\n' +
      '🏥 /health — Статус всех сервисов',
    { parse_mode: 'Markdown' }
  );
});

bot.command('topics', (ctx) => topicsHandler.listPending(ctx));
bot.command('scripts', (ctx) => scriptsHandler.listPending(ctx));
bot.command('stats', (ctx) => statsHandler.overview(ctx));
bot.command('health', (ctx) => statsHandler.health(ctx));

// ---- Inline callbacks ----
bot.callbackQuery(/^approve_topic:(.+)$/, (ctx) => topicsHandler.approve(ctx));
bot.callbackQuery(/^reject_topic:(.+)$/, (ctx) => topicsHandler.reject(ctx));
bot.callbackQuery(/^topic_details:(.+)$/, (ctx) => topicsHandler.details(ctx));
bot.callbackQuery(/^approve_script:(.+)$/, (ctx) => scriptsHandler.approve(ctx));
bot.callbackQuery(/^reject_script:(.+)$/, (ctx) => scriptsHandler.reject(ctx));
bot.callbackQuery(/^script_details:(.+)$/, (ctx) => scriptsHandler.details(ctx));

bot.catch((err) => {
  logger.error({ err: err.error }, `Bot error on update ${err.ctx.update.update_id}`);
});
