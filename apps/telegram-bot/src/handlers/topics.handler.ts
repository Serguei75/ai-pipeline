import { type Context, InlineKeyboard } from 'grammy';
import { ApiGatewayService } from '../services/api-gateway.service.js';
import { logger } from '../logger.js';

const api = new ApiGatewayService();

export class TopicsHandler {
  async listPending(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');
    const topics = await api.getTopics({ status: 'PENDING_APPROVAL', perPage: 5 });

    if (!topics.length) {
      await ctx.reply('✅ Нет тем на одобрение!');
      return;
    }

    await ctx.reply(`📋 *Темы на одобрение (${topics.length}):*`, { parse_mode: 'Markdown' });

    for (const topic of topics) {
      const kb = new InlineKeyboard()
        .text('✅ Одобрить', `approve_topic:${topic.id}`)
        .text('❌ Отклонить', `reject_topic:${topic.id}`)
        .row()
        .text('🔍 Детали', `topic_details:${topic.id}`);

      await ctx.reply(
        `*${topic.title}*\n` +
          `📌 Ниша: ${topic.niche ?? 'N/A'}\n` +
          `🌍 Рынки: ${topic.targetMarkets?.join(', ') ?? 'N/A'}\n` +
          `💰 CPM ~$${topic.estimatedCPM ?? 'N/A'}\n` +
          `📺 Формат: ${topic.contentFormat ?? 'N/A'}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  }

  async approve(ctx: Context): Promise<void> {
    const topicId = (ctx.match as RegExpMatchArray)[1];
    try {
      await api.approveTopic(topicId);
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      await ctx.answerCallbackQuery('✅ Тема одобрена → Script Engine');
    } catch (err) {
      logger.error({ err, topicId }, 'approve_topic failed');
      await ctx.answerCallbackQuery('❌ Ошибка');
    }
  }

  async reject(ctx: Context): Promise<void> {
    const topicId = (ctx.match as RegExpMatchArray)[1];
    try {
      await api.rejectTopic(topicId);
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      await ctx.answerCallbackQuery('❌ Тема отклонена');
    } catch (err) {
      logger.error({ err, topicId }, 'reject_topic failed');
      await ctx.answerCallbackQuery('❌ Ошибка');
    }
  }

  async details(ctx: Context): Promise<void> {
    const topicId = (ctx.match as RegExpMatchArray)[1];
    const topic = await api.getTopic(topicId);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📋 *Детали темы*\n\n` +
        `*${topic.title}*\n\n` +
        `📝 ${topic.description ?? 'Нет описания'}\n\n` +
        `🏷 Ключевые слова: ${topic.keywords?.join(', ') ?? 'N/A'}\n` +
        `🎯 Hook score: ${topic.hookScore ?? 'N/A'}/100\n` +
        `📅 ${new Date(topic.createdAt).toLocaleDateString('ru-RU')}`,
      { parse_mode: 'Markdown' }
    );
  }
}
