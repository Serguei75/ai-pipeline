import { Context } from 'grammy';
import * as api from '../services/api';

function serviceIcon(status: string): string {
  return status === 'ok' || status === 'healthy' ? '✅' : '❌';
}

export const handleStats = {
  async show(ctx: Context) {
    try {
      const health = await api.getHealthAll();
      const services = health.services ?? {};
      const overallOk = Object.values(services).every((s: any) => s.status === 'ok' || s.status === 'healthy');

      const lines = Object.entries(services).map(([name, s]: [string, any]) => {
        const icon = serviceIcon(s.status);
        const latency = s.latencyMs !== undefined ? ` — ${s.latencyMs}ms` : '';
        return `${icon} ${name}${latency}`;
      });

      let statsText = '';
      try {
        const analytics = await api.getAnalyticsStats();
        const a = analytics.data ?? analytics;
        statsText =
          `\n📊 *Аналитика (7д)*\n` +
          `   📹 Видео: ${a.totalVideos ?? 0}\n` +
          `   👁 Просмотры: ${(a.totalViews ?? 0).toLocaleString('ru-RU')}\n` +
          `   💰 Средний RPM: $${(a.avgRpm ?? 0).toFixed(2)}\n` +
          `   🎣 Retention 0–8s: ${a.avgRetention8s ?? 0}%`;
      } catch { /* analytics unavailable */ }

      let hookText = '';
      try {
        const hooks = await api.getHookTesterStats();
        if (hooks.length) {
          hookText =
            `\n\n🏆 *Последние победители A/B тестов*\n` +
            hooks.slice(0, 3).map((h: any) =>
              `   • "${(h.winnerHook ?? 'N/A').slice(0, 40)}" — ${h.winnerRetention8s ?? 0}%`
            ).join('\n');
        }
      } catch { /* hook tester unavailable */ }

      const overall = overallOk ? '🟢 Все сервисы работают' : '🔴 Есть проблемы';
      const text =
        `📡 *Статус системы* — ${overall}\n\n` +
        lines.join('\n') +
        statsText +
        hookText;

      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(
        '❌ *API Gateway недоступен*\n\n' +
        'Проверь, что запущен `core/api-gateway` на порту 3100.',
        { parse_mode: 'Markdown' }
      );
    }
  },
};
