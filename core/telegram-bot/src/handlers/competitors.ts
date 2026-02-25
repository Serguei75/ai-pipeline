import { Context, InlineKeyboard } from 'grammy';

const GW = process.env.GATEWAY_URL || 'http://localhost:3100';

export const handleCompetitors = {
  // /competitors — список каналов
  list: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/competitors/channels`);
      if (!res.ok) return ctx.reply('❌ Competitor Intelligence недоступен');
      const channels: any[] = await res.json();

      if (!channels.length) {
        return ctx.reply(
          '📺 *Конкуренты*\n\n'
          + 'Каналов пока нет.\n'
          + 'Admin UI → /competitors',
          { parse_mode: 'Markdown' }
        );
      }

      const lines = channels.map((ch: any, i: number) => {
        const vids = ch._count?.videos ?? 0;
        const sync = ch.lastSyncAt
          ? new Date(ch.lastSyncAt).toLocaleDateString('ru')
          : 'никогда';
        return `${i + 1}. *${ch.name}*${ch.niche ? ` [${ch.niche}]` : ''}\n   · видео: ${vids} · синх: ${sync}`;
      }).join('\n\n');

      return ctx.reply(
        `📺 *Отслеживаемые каналы* (${channels.length})\n\n${lines}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },

  // /competitor_trends — топ трендов за 7 дней
  trends: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/competitors/trends?days=7&limit=10`);
      if (!res.ok) return ctx.reply('❌ Competitor Intelligence недоступен');
      const data = await res.json();

      if (!data.total) {
        return ctx.reply('📈 Трендов пока нет — додайте каналы и дождитесь синхронизации.');
      }

      const lines = (data.topVideos as any[]).slice(0, 7).map((v: any, i: number) =>
        `${i + 1}. [${v.channel?.name ?? '?'}] *${Math.round(v.viewVelocity ?? 0).toLocaleString()}* пр/д\n   _${v.title.slice(0, 55)}_`
      ).join('\n\n');

      return ctx.reply(
        `📈 *Топ тренды конкурентов* (7 дней)\n\n${lines}\n\n🔍 Всего: ${data.total} видео`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },

  // /ideas — пендинг идеи с кнопками экспорта
  ideas: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/competitors/ideas?status=PENDING&limit=5`);
      if (!res.ok) return ctx.reply('❌ Competitor Intelligence недоступен');
      const { data, total } = await res.json();

      if (!data?.length) {
        return ctx.reply(
          '💡 *Идеи AI*\n\n'
          + 'Новых идей нет.\n'
          + 'Admin UI → /competitors → выбери канал → AI-анализ',
          { parse_mode: 'Markdown' }
        );
      }

      const HOOK_EMOJI: Record<string, string> = {
        fear: '🚨', curiosity: '🤔', surprise: '🤯',
        desire: '✨', social_proof: '🔥',
      };

      for (const idea of data) {
        const kb = new InlineKeyboard()
          .text('↗️ Экспорт', `idea:export:${idea.id}`)
          .text('❌ Игнор', `idea:reject:${idea.id}`);

        await ctx.reply(
          `💡 *${idea.title}*\n\n` +
          `${HOOK_EMOJI[idea.hookType] ?? '🎨'} ${idea.hookType}` +
          (idea.estimatedCpm ? ` · $${idea.estimatedCpm} CPM` : '') + '\n\n' +
          `_${idea.angle.slice(0, 120)}_\n\n` +
          `📎 ${idea.sourceVideo?.channel?.name ?? '?'}: _${(idea.sourceVideo?.title ?? '').slice(0, 50)}_`,
          { parse_mode: 'Markdown', reply_markup: kb }
        );
      }

      if (total > 5) {
        await ctx.reply(`_...и ещё ${total - 5} идей в Admin UI_`, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },

  // Коллбэк: idea:export:<id>
  callbackExport: async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const ideaId = ctx.match?.[1];
    if (!ideaId) return;
    try {
      const res = await fetch(`${GW}/competitors/ideas/${ideaId}/export`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      await ctx.reply('✅ Идея экспортирована в Topic Engine!');
    } catch (e) {
      await ctx.reply(`❌ ${(e as Error).message}`);
    }
  },

  // Коллбэк: idea:reject:<id>
  callbackReject: async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const ideaId = ctx.match?.[1];
    if (!ideaId) return;
    try {
      await fetch(`${GW}/competitors/ideas/${ideaId}`, { method: 'DELETE' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      await ctx.reply('🚫 Идея отклонена.');
    } catch {}
  },
};
