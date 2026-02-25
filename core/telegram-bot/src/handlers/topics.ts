import { Context, InlineKeyboard } from 'grammy';
import * as api from '../services/api';

function formatTopicCard(t: any, i: number): string {
  return (
    `${i + 1}. *${t.title ?? t.keyword ?? 'Без названия'}*\n` +
    `   🎯 ${t.niche ?? '—'} | ⭐ ${t.priority ?? 'MEDIUM'} | 📊 ${t.score ?? 0} pts`
  );
}

export const handleTopics = {
  async list(ctx: Context) {
    try {
      const items = await api.getPendingTopics();

      if (!items.length) {
        await ctx.reply('✅ *Нет тем на одобрение*\n\nВсе темы обработаны!', { parse_mode: 'Markdown' });
        return;
      }

      const slice = items.slice(0, 5);
      const text = `📌 *Темы на одобрение* (${items.length})\n\n` + slice.map(formatTopicCard).join('\n\n');

      const keyboard = new InlineKeyboard();
      slice.forEach((t: any, i: number) => {
        keyboard
          .text(`✅ ${i + 1}`, `topic:approve:${t.id}`)
          .text(`❌ ${i + 1}`, `topic:reject:${t.id}`);
        if ((i + 1) % 2 === 0) keyboard.row();
      });
      keyboard.row().text('🔄 Обновить', 'menu:topics');

      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch {
      await ctx.reply('❌ Не удалось загрузить темы. Проверь статус API Gateway (`/stats`).');
    }
  },

  async approve(ctx: Context) {
    const id = ctx.message?.text?.split(' ')[1];
    if (!id) { await ctx.reply('Использование: `/approve_topic <id>`', { parse_mode: 'Markdown' }); return; }
    try {
      await api.approveTopic(id);
      await ctx.reply(`✅ Тема \`${id}\` *одобрена!*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`❌ Не удалось одобрить тему \`${id}\``, { parse_mode: 'Markdown' });
    }
  },

  async reject(ctx: Context) {
    const parts = ctx.message?.text?.split(' ');
    const id = parts?.[1];
    if (!id) { await ctx.reply('Использование: `/reject_topic <id>`', { parse_mode: 'Markdown' }); return; }
    try {
      await api.rejectTopic(id);
      await ctx.reply(`❌ Тема \`${id}\` *отклонена*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`❌ Не удалось отклонить тему \`${id}\``, { parse_mode: 'Markdown' });
    }
  },

  async callbackApprove(ctx: Context) {
    const id = (ctx as any).match?.[1] as string;
    await ctx.answerCallbackQuery({ text: '⏳ Одобряем...' });
    try {
      await api.approveTopic(id);
      const original = (ctx.callbackQuery?.message as any)?.text ?? '';
      await ctx.editMessageText(original + '\n\n✅ *Одобрено!*', { parse_mode: 'Markdown' });
    } catch {
      await ctx.answerCallbackQuery({ text: '❌ Ошибка API', show_alert: true });
    }
  },

  async callbackReject(ctx: Context) {
    const id = (ctx as any).match?.[1] as string;
    await ctx.answerCallbackQuery({ text: '⏳ Отклоняем...' });
    try {
      await api.rejectTopic(id);
      const original = (ctx.callbackQuery?.message as any)?.text ?? '';
      await ctx.editMessageText(original + '\n\n❌ *Отклонено*', { parse_mode: 'Markdown' });
    } catch {
      await ctx.answerCallbackQuery({ text: '❌ Ошибка API', show_alert: true });
    }
  },
};
