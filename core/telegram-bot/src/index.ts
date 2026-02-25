import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { handleTopics } from './handlers/topics';
import { handleScripts } from './handlers/scripts';
import { handleStats } from './handlers/stats';
import { handleThumbnails } from './handlers/thumbnails';
import { handleCosts } from './handlers/costs';
import { EventConsumer } from './services/events';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(TOKEN);

// ── Auth middleware ────────────────────────────────────────────────────────────
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

// ── /start ───────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('📌 Темы',      'menu:topics')
    .text('📝 Скрипты',   'menu:scripts')
    .row()
    .text('🎨 Обложки',  'menu:thumbnails')
    .text('💰 Расходы',  'menu:costs')
    .row()
    .text('📊 Статистика', 'menu:stats')
    .text('💬 Комменты', 'menu:community');

  await ctx.reply(
    `🤖 *AI YouTube Pipeline Bot*\n\n` +
    `📌 /topics — темы на одобрение\n` +
    `📝 /scripts — скрипты на одобрение\n` +
    `🎨 /thumbnails — последние обложки\n` +
    `🔬 /ab\_tests — активные A/B тесты\n` +
    `💰 /costs — расходы API\n` +
    `📊 /stats — статус сервисов\n\n` +
    `✅ /approve\_topic <id> · ❌ /reject\_topic <id>\n` +
    `✅ /approve\_script <id> · ❌ /reject\_script <id>`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// ── /help ───────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => ctx.reply(
  `*Доступные команды:*\n\n` +
  `📌 Контент\n` +
  `/topics — темы на одобрение\n` +
  `/scripts — скрипты на одобрение\n` +
  `/approve\_topic <id> · /reject\_topic <id>\n` +
  `/approve\_script <id> · /reject\_script <id>\n\n` +
  `🎨 Обложки\n` +
  `/thumbnails — последние обложки\n` +
  `/thumbnail\_stats — статистика\n` +
  `/ab\_tests — активные A/B тесты\n\n` +
  `💰 Расходы\n` +
  `/costs — сводка расходов API\n\n` +
  `📊 Система\n` +
  `/stats — статус всех сервисов`,
  { parse_mode: 'Markdown' }
));

// ── Команды: Topics ──────────────────────────────────────────────────
bot.command('topics',         handleTopics.list);
bot.command('approve_topic',  handleTopics.approve);
bot.command('reject_topic',   handleTopics.reject);

// ── Команды: Scripts ──────────────────────────────────────────────────
bot.command('scripts',        handleScripts.list);
bot.command('approve_script', handleScripts.approve);
bot.command('reject_script',  handleScripts.reject);

// ── Команды: Thumbnails (NEW) ────────────────────────────────────────
bot.command('thumbnails',       handleThumbnails.list);
bot.command('thumbnail_stats',  handleThumbnails.stats);
bot.command('ab_tests',         handleThumbnails.abTests);

// ── Команды: Costs (NEW) ──────────────────────────────────────────────
bot.command('costs', handleCosts.show);

// ── Команды: Stats ────────────────────────────────────────────────────
bot.command('stats', handleStats.show);

// ── Inline callbacks ───────────────────────────────────────────────────────
bot.callbackQuery('menu:topics',     async (ctx) => { await ctx.answerCallbackQuery(); await handleTopics.list(ctx); });
bot.callbackQuery('menu:scripts',    async (ctx) => { await ctx.answerCallbackQuery(); await handleScripts.list(ctx); });
bot.callbackQuery('menu:stats',      async (ctx) => { await ctx.answerCallbackQuery(); await handleStats.show(ctx); });
bot.callbackQuery('menu:thumbnails', async (ctx) => { await ctx.answerCallbackQuery(); await handleThumbnails.list(ctx); });
bot.callbackQuery('menu:costs',      async (ctx) => { await ctx.answerCallbackQuery(); await handleCosts.show(ctx); });
bot.callbackQuery('menu:community',  async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('💬 *Community Engine*\n\nУведомления приходят автоматически при экспорте темы.', { parse_mode: 'Markdown' });
});

bot.callbackQuery(/^topic:approve:(.+)$/,  handleTopics.callbackApprove);
bot.callbackQuery(/^topic:reject:(.+)$/,   handleTopics.callbackReject);
bot.callbackQuery(/^script:approve:(.+)$/, handleScripts.callbackApprove);
bot.callbackQuery(/^script:reject:(.+)$/,  handleScripts.callbackReject);

// ── Event Bus consumer ──────────────────────────────────────────────────────
const consumer = new EventConsumer(bot);
consumer.start().catch(e => console.warn('Event consumer failed to start:', e));

// ── Error handling ─────────────────────────────────────────────────────────
bot.catch((err) => { console.error('Bot error:', err.error); });

process.on('SIGINT',  () => { consumer.stop(); bot.stop(); process.exit(0); });
process.on('SIGTERM', () => { consumer.stop(); bot.stop(); process.exit(0); });

console.log('🤖 Telegram Bot starting (long polling)...');
bot.start({
  onStart: (info) => {
    console.log(`✅ Bot @${info.username} is running`);
    console.log(`   Commands: /topics /scripts /thumbnails /ab_tests /costs /stats`);
  },
});
