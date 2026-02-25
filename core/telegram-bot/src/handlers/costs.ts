import { Context } from 'grammy';

const GW = process.env.GATEWAY_URL || 'http://localhost:3100';

export const handleCosts = {
  // /costs — сводка расходов
  show: async (ctx: Context) => {
    try {
      const res = await fetch(`${GW}/costs/summary`);
      if (!res.ok) return ctx.reply('❌ Cost Tracker недоступен');
      const s = await res.json();

      const moduleLines = (s.byModule ?? []).slice(0, 6).map((m: any) =>
        `  · \`${m.module}\`: *$${m.costUsd}* (${m.requests} req)`
      ).join('\n');

      const providerLines = (s.byProvider ?? []).map((p: any) =>
        `  · ${p.provider}: *$${p.costUsd}*`
      ).join('\n');

      return ctx.reply(
        `💰 *Расходы API*\n\n` +
        `💵 Всего: *$${s.totalCostUsd}*\n` +
        `📡 API-вызовов: *${s.totalApiCalls}*\n\n` +
        `*По модулям:*\n${moduleLines || '  нет данных'}\n\n` +
        `*По провайдерам:*\n${providerLines || '  нет данных'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${(e as Error).message}`);
    }
  },
};
