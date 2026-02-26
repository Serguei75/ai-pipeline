import { FastifyInstance } from 'fastify';
import { getPrisma } from '../services/prisma.js';

export async function costRoutes(app: FastifyInstance): Promise<void> {

  // GET /costs — список записей с фильтрами
  app.get<{
    Querystring: { module?: string; provider?: string; videoId?: string; from?: string; to?: string; page?: string };
  }>('/costs', async (req, reply) => {
    const { module, provider, videoId, from, to, page = '1' } = req.query;
    const skip = (parseInt(page) - 1) * 50;
    const where: Record<string, unknown> = {};
    if (module)   where.module = module;
    if (provider) where.provider = provider;
    if (videoId)  where.videoId = videoId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      };
    }
    const prisma = getPrisma();
    const [data, total] = await Promise.all([
      prisma.costEntry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: 50 }),
      prisma.costEntry.count({ where }),
    ]);
    return reply.send({ data, total, page: parseInt(page), perPage: 50 });
  });

  // GET /costs/summary — итоги по модулю и провайдеру
  app.get('/costs/summary', async (_req, reply) => {
    const prisma = getPrisma();
    const [byModule, byProvider, total, last30days] = await Promise.all([
      prisma.costEntry.groupBy({
        by: ['module'],
        _sum:   { costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { costUsd: 'desc' } },
      }),
      prisma.costEntry.groupBy({
        by: ['provider'],
        _sum:   { costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { costUsd: 'desc' } },
      }),
      prisma.costEntry.aggregate({
        _sum:   { costUsd: true },
        _count: { id: true },
      }),
      prisma.dailyCostSummary.findMany({
        where: { date: { gte: new Date(Date.now() - 30 * 86400_000) } },
        orderBy: { date: 'asc' },
      }),
    ]);

    return reply.send({
      totalCostUsd:  Number(total._sum.costUsd ?? 0).toFixed(6),
      totalApiCalls: total._count.id,
      byModule: byModule.map(m => ({
        module:    m.module,
        costUsd:   Number(m._sum.costUsd ?? 0).toFixed(6),
        requests:  m._count.id,
      })),
      byProvider: byProvider.map(p => ({
        provider:  p.provider,
        costUsd:   Number(p._sum.costUsd ?? 0).toFixed(6),
        requests:  p._count.id,
      })),
      last30days,
    });
  });

  // GET /costs/roi/:videoId — ROI конкретного видео
  app.get<{ Params: { videoId: string } }>('/costs/roi/:videoId', async (req, reply) => {
    const { videoId } = req.params;
    const entries = await getPrisma().costEntry.findMany({
      where: { videoId },
      orderBy: { createdAt: 'asc' },
    });
    const totalCost = entries.reduce((s, e) => s + Number(e.costUsd), 0);
    const byModule = entries.reduce((acc, e) => {
      acc[e.module] = (acc[e.module] ?? 0) + Number(e.costUsd);
      return acc;
    }, {} as Record<string, number>);
    return reply.send({
      videoId,
      totalCostUsd:   totalCost.toFixed(6),
      entriesCount:   entries.length,
      byModule,
      entries,
    });
  });

  // GET /costs/daily?days=30 — данные для графика
  app.get<{ Querystring: { days?: string } }>('/costs/daily', async (req, reply) => {
    const days = parseInt(req.query.days ?? '30');
    const from = new Date(Date.now() - days * 86400_000);
    const summaries = await getPrisma().dailyCostSummary.findMany({
      where: { date: { gte: from } },
      orderBy: { date: 'asc' },
    });
    // Группируем по дате
    const byDate: Record<string, { date: string; totalCost: number; byProvider: Record<string, number> }> = {};
    for (const s of summaries) {
      const d = s.date.toISOString().split('T')[0];
      if (!byDate[d]) byDate[d] = { date: d, totalCost: 0, byProvider: {} };
      byDate[d].totalCost += Number(s.totalCostUsd);
      byDate[d].byProvider[s.provider] = (byDate[d].byProvider[s.provider] ?? 0) + Number(s.totalCostUsd);
    }
    return reply.send({ days, data: Object.values(byDate) });
  });

  // POST /costs/manual — ручная запись (для модулей без Event Bus)
  app.post<{
    Body: { module: string; provider: string; model: string; costUsd: number; videoId?: string; jobId?: string; eventType?: string };
  }>('/costs/manual', async (req, reply) => {
    const { module, provider, model, costUsd, videoId, jobId, eventType = 'manual' } = req.body;
    if (!module || !provider || !model || costUsd === undefined) {
      return reply.status(400).send({ error: 'module, provider, model, costUsd are required' });
    }
    const entry = await getPrisma().costEntry.create({
      data: { module, provider, model, costUsd, videoId, jobId, eventType },
    });
    return reply.send(entry);
  });
}
