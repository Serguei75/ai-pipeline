import { type Context } from 'grammy';
import { ApiGatewayService } from '../services/api-gateway.service.js';

const api = new ApiGatewayService();

export class StatsHandler {
  async overview(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');
    const [stats, health] = await Promise.all([api.getDashboard(), api.getHealth()]);

    const services = health.services ?? {};
    const online = Object.values(services).filter((s: any) => s.status === 'ok').length;
    const total = Object.keys(services).length;

    await ctx.reply(
      `📊 *AI Pipeline — Обзор*\n\n` +
        `🏥 Сервисы: ${online}/${total} онлайн\n\n` +
        `📋 Тем в очереди: ${stats.pendingTopics ?? 0}\n` +
        `📝 Скриптов на ревью: ${stats.scriptsUnderReview ?? 0}\n` +
        `🎤 Voice jobs: ${stats.activeVoiceJobs ?? 0}\n` +
        `🎬 Media jobs: ${stats.activeMediaJobs ?? 0}\n\n` +
        `💰 RPM (avg): $${stats.avgRPM?.toFixed(2) ?? 'N/A'}\n` +
        `👁 Views (7d): ${stats.views7d?.toLocaleString('ru-RU') ?? 'N/A'}\n` +
        `💵 Revenue (7d): $${stats.revenue7d?.toFixed(2) ?? 'N/A'}`,
      { parse_mode: 'Markdown' }
    );
  }

  async health(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');
    const health = await api.getHealth();

    const lines = Object.entries(health.services ?? {}).map(([name, svc]: [string, any]) => {
      const icon = svc.status === 'ok' ? '🟢' : svc.status === 'error' ? '🟡' : '🔴';
      const latency = svc.latencyMs != null ? ` (${svc.latencyMs}ms)` : '';
      return `${icon} ${name}${latency}`;
    });

    await ctx.reply(
      `🏥 *Статус сервисов*\n\n` + lines.join('\n'),
      { parse_mode: 'Markdown' }
    );
  }
}
