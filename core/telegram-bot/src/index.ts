import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { handleTopics } from './handlers/topics';
import { handleScripts } from './handlers/scripts';
import { handleStats } from './handlers/stats';
import { EventConsumer } from './services/events';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(TOKEN);

// ─── Auth middleware ──────────────────────────────────────────────────────────
const allowedIds = (process.env.ALLOWED_CHAT_IDS || '')
  .split(',')
  .map(s => parseInt(s.trim()))
  .filter(Boolean);

bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id;
  if (allowedIds.length > 0 && chatId && !allowedIds.includes(chatId)) {
    await ctx.reply('⛔ Доступ запрещён.');
    return;
  }
  await next();
});

// ─── Commands ─────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('📌 Темы', 'menu:topics')
    .text('📝 Скрипты', 'menu:scripts')
    .row()
    .text('📊 Статистика', 'menu:stats')
    .text('💬 Комментарии', 'menu:community');

  await ctx.reply(
    `🤖 *AI YouTube Pipeline Bot*\n\n` +
    `Управляй пайплайном прямо из Telegram!\n\n` +
    `📌 /topics — темы на одобрение\n` +
    `📝 /scripts — скрипты на одобрение\n` +
    `📊 /stats — статус системы\n` +
    `✅ /approve_topic <id> — одобрить тему\n` +
    `✅ /approve_script <id> — одобрить скрипт\n` +
    `❌ /reject_topic <id> — отклонить тему\n` +
    `❌ /reject_script <id> — отклонить скрипт`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

bot.command('help', async (ctx) => ctx.reply(
  `*Доступные команды:*\n\n` +
  `/start — главное меню\n` +
  `/topics — темы на одобрение\n` +
  `/scripts — скрипты на одобрение\n` +
  `/stats — статус всех сервисов\n` +
  `/approve_topic <id>\n` +
  `/reject_topic <id>\n` +
  `/approve_script <id>\n` +
  `/reject_script <id>`,
  { parse_mode: 'Markdown' }
));

bot.command('topics', handleTopics.list);
bot.command('approve_topic', handleTopics.approve);
bot.command('reject_topic', handleTopics.reject);

bot.command('scripts', handleScripts.list);
bot.command('approve_script', handleScripts.approve);
bot.command('reject_script', handleScripts.reject);

bot.command('stats', handleStats.show);

// ─── Inline callbacks ─────────────────────────────────────────────────────────
bot.callbackQuery('menu:topics', async (ctx) => { await ctx.answerCallbackQuery(); await handleTopics.list(ctx); });
bot.callbackQuery('menu:scripts', async (ctx) => { await ctx.answerCallbackQuery(); await handleScripts.list(ctx); });
bot.callbackQuery('menu:stats', async (ctx) => { await ctx.answerCallbackQuery(); await handleStats.show(ctx); });
bot.callbackQuery('menu:community', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('💬 *Community Engine*\n\nМодуль комментариев интегрирован — уведомления приходят автоматически при экспорте темы.', { parse_mode: 'Markdown' });
});

bot.callbackQuery(/^topic:approve:(.+)$/, handleTopics.callbackApprove);
bot.callbackQuery(/^topic:reject:(.+)$/, handleTopics.callbackReject);
bot.callbackQuery(/^script:approve:(.+)$/, handleScripts.callbackApprove);
bot.callbackQuery(/^script:reject:(.+)$/, handleScripts.callbackReject);

// ─── Event Bus consumer (push notifications) ─────────────────────────────────
const consumer = new EventConsumer(bot);
consumer.start().catch(e => console.warn('Event consumer failed to start:', e));

// ─── Error handling ───────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error('Bot error:', err.error);
});

process.on('SIGINT', () => { consumer.stop(); bot.stop(); process.exit(0); });
process.on('SIGTERM', () => { consumer.stop(); bot.stop(); process.exit(0); });

console.log('🤖 Telegram Bot starting (long polling)...');
bot.start({
  onStart: (info) => console.log(`✅ Bot @${info.username} is running`),
});
