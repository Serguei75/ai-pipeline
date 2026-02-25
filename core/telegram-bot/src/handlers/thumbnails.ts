import { Context, InlineKeyboard } from 'grammy';

const GW = process.env.GATEWAY_URL || 'http://localhost:3100';

const HOOK_INFO: Record<string, string> = {
  fear: '🚨 Fear', curiosity: '🤔 Curiosity',
  surprise: '🤯 Surprise', desire: '✨ Desire',
  social_proof: '🔥 Social Proof',
};

export const handleThumbnails = {
  // /thumbnails — последние обложки
  list: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/thumbnails?page=1`);
      if (!res.ok) return ctx.reply('❌ Thumbnail Engine недоступен');
      const data = await res.json();
      const jobs = (data.data ?? []).slice(0, 5);
      if (!jobs.length) {
        return ctx.reply('🎨 Обложек пока нет\n\nСоздайте первую через Admin UI → /thumbnails');
      }
      const lines = jobs.map((j: any, i: number) => {
        const s = j.status === 'DONE' ? '✅' : j.status === 'FAILED' ? '❌' : '⏳';
        const cost = j.costUsd && Number(j.costUsd) > 0 ? ` · $${j.costUsd}` : '';
        return `${i + 1}. ${s} [${j.provider}${cost}]\n   _${j.prompt.slice(0, 45)}..._`;
      }).join('\n\n');
      return ctx.reply(
        `🎨 *Последние обложки*\n\n${lines}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },

  // /thumbnail_stats — статистика
  stats: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/thumbnails/stats`);
      if (!res.ok) return ctx.reply('❌ Thumbnail Engine недоступен');
      const s = await res.json();
      return ctx.reply(
        `📊 *Статистика обложек*\n\n` +
        `🎨 Всего: *${s.total}*\n` +
        `✅ Готово: *${s.done}*\n` +
        `❌ Ошибок: *${s.failed}*\n` +
        `📈 Success rate: *${s.successRate}*\n` +
        `💰 Расходы: *$${s.totalCostUsd}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },

  // /ab_tests — последние A/B тесты
  abTests: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/thumbnails/ab-tests?status=RUNNING`);
      if (!res.ok) return ctx.reply('❌ Thumbnail Engine недоступен');
      const tests: any[] = await res.json();
      if (!tests.length) {
        return ctx.reply('🔬 Активных A/B тестов нет\n\nСоздайте через Admin UI → /thumbnails');
      }
      const lines = tests.slice(0, 5).map((t: any, i: number) => {
        const variants = t.variants.map((v: any) =>
          `${HOOK_INFO[v.hookType] ?? v.hookType}: CTR ${v.ctr != null ? (v.ctr * 100).toFixed(1) + '%' : '—'}`
        ).join(' | ');
        return `${i + 1}. Video \`${t.videoId}\`\n   ${variants}`;
      }).join('\n\n');
      return ctx.reply(
        `🔬 *Активные A/B тесты (обложки)*\n\n${lines}\n\n_Выбери победителя в Admin UI_`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },
};
