import { type Context, InlineKeyboard } from 'grammy';
import { ApiGatewayService } from '../services/api-gateway.service.js';
import { logger } from '../logger.js';

const api = new ApiGatewayService();

export class ScriptsHandler {
  async listPending(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');
    const scripts = await api.getScripts({ status: 'UNDER_REVIEW', perPage: 5 });

    if (!scripts.length) {
      await ctx.reply('✅ Нет скриптов на ревью!');
      return;
    }

    await ctx.reply(`📝 *Скрипты на одобрение (${scripts.length}):*`, { parse_mode: 'Markdown' });

    for (const script of scripts) {
      const hookPreview = script.hookText?.substring(0, 80) ?? 'N/A';
      const kb = new InlineKeyboard()
        .text('✅ Одобрить', `approve_script:${script.id}`)
        .text('❌ Отклонить', `reject_script:${script.id}`)
        .row()
        .text('🔍 Детали', `script_details:${script.id}`);

      await ctx.reply(
        `*${script.title}*\n` +
          `📺 Формат: ${script.format ?? 'N/A'}\n` +
          `🎣 Hook: _${hookPreview}..._\n` +
          `⏱ ~${script.estimatedDuration ?? 'N/A'} сек`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  }

  async approve(ctx: Context): Promise<void> {
    const scriptId = (ctx.match as RegExpMatchArray)[1];
    try {
      await api.approveScript(scriptId);
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      await ctx.answerCallbackQuery('✅ Одобрен → Media Engine');
    } catch (err) {
      logger.error({ err, scriptId }, 'approve_script failed');
      await ctx.answerCallbackQuery('❌ Ошибка');
    }
  }

  async reject(ctx: Context): Promise<void> {
    const scriptId = (ctx.match as RegExpMatchArray)[1];
    try {
      await api.rejectScript(scriptId);
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      await ctx.answerCallbackQuery('❌ Отклонён');
    } catch (err) {
      logger.error({ err, scriptId }, 'reject_script failed');
      await ctx.answerCallbackQuery('❌ Ошибка');
    }
  }

  async details(ctx: Context): Promise<void> {
    const scriptId = (ctx.match as RegExpMatchArray)[1];
    const script = await api.getScript(scriptId);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 *Детали скрипта*\n\n` +
        `*${script.title}*\n\n` +
        `🎣 *Hook:* ${script.hookText ?? 'N/A'}\n\n` +
        `📖 *Начало:* ${script.body?.substring(0, 200) ?? 'N/A'}...\n\n` +
        `🎞 Эмоция хука: ${script.hookEmotion ?? 'N/A'}`,
      { parse_mode: 'Markdown' }
    );
  }
}
