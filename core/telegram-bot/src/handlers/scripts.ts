import { Context, InlineKeyboard } from 'grammy';
import * as api from '../services/api';

function formatScriptCard(s: any, i: number): string {
  return (
    `${i + 1}. *${s.topicTitle ?? s.title ?? 'Без названия'}*\n` +
    `   ⏱ ~${s.estimatedDuration ?? '?'} мин | 🎣 "${(s.hook ?? 'N/A').slice(0, 50)}${(s.hook?.length ?? 0) > 50 ? '…' : ''}"`
  );
}

export const handleScripts = {
  async list(ctx: Context) {
    try {
      const items = await api.getPendingScripts();

      if (!items.length) {
        await ctx.reply('✅ *Нет скриптов на одобрение*', { parse_mode: 'Markdown' });
        return;
      }

      const slice = items.slice(0, 5);
      const text = `📝 *Скрипты на одобрение* (${items.length})\n\n` + slice.map(formatScriptCard).join('\n\n');

      const keyboard = new InlineKeyboard();
      slice.forEach((s: any, i: number) => {
        keyboard
          .text(`✅ ${i + 1}`, `script:approve:${s.id}`)
          .text(`❌ ${i + 1}`, `script:reject:${s.id}`);
        if ((i + 1) % 2 === 0) keyboard.row();
      });
      keyboard.row().text('🔄 Обновить', 'menu:scripts');

      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch {
      await ctx.reply('❌ Не удалось загрузить скрипты.');
    }
  },

  async approve(ctx: Context) {
    const id = ctx.message?.text?.split(' ')[1];
    if (!id) { await ctx.reply('Использование: `/approve_script <id>`', { parse_mode: 'Markdown' }); return; }
    try {
      await api.approveScript(id);
      await ctx.reply(`✅ Скрипт \`${id}\` *одобрен!*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`❌ Не удалось одобрить скрипт \`${id}\``, { parse_mode: 'Markdown' });
    }
  },

  async reject(ctx: Context) {
    const id = ctx.message?.text?.split(' ')[1];
    if (!id) { await ctx.reply('Использование: `/reject_script <id>`', { parse_mode: 'Markdown' }); return; }
    try {
      await api.rejectScript(id);
      await ctx.reply(`❌ Скрипт \`${id}\` *отклонён*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`❌ Не удалось отклонить скрипт \`${id}\``, { parse_mode: 'Markdown' });
    }
  },

  async callbackApprove(ctx: Context) {
    const id = (ctx as any).match?.[1] as string;
    await ctx.answerCallbackQuery({ text: '⏳ Одобряем...' });
    try {
      await api.approveScript(id);
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
      await api.rejectScript(id);
      const original = (ctx.callbackQuery?.message as any)?.text ?? '';
      await ctx.editMessageText(original + '\n\n❌ *Отклонено*', { parse_mode: 'Markdown' });
    } catch {
      await ctx.answerCallbackQuery({ text: '❌ Ошибка API', show_alert: true });
    }
  },
};
