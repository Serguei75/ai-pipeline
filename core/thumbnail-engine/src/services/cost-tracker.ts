import { getPrisma } from './prisma';

export async function logCost(params: {
  jobId: string;
  provider: string;
  model: string;
  costUsd: number;
  steps?: number;
  responseMs?: number;
}): Promise<void> {
  try {
    await getPrisma().thumbnailCostLog.create({
      data: {
        jobId: params.jobId,
        provider: params.provider,
        model: params.model,
        costUsd: params.costUsd,
        steps: params.steps,
        responseMs: params.responseMs,
      },
    });
  } catch (e) {
    console.error('[CostTracker] Failed to log cost:', (e as Error).message);
  }
}

export async function getTotalCost(provider?: string): Promise<number> {
  const result = await getPrisma().thumbnailCostLog.aggregate({
    _sum: { costUsd: true },
    where: provider ? { provider } : undefined,
  });
  return Number(result._sum.costUsd ?? 0);
}
