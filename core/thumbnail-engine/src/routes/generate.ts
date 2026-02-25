import { FastifyInstance } from 'fastify';
import { GenerateRequest, ASPECT_CONFIGS, Provider } from '../types';
import { HuggingFaceProvider } from '../providers/huggingface';
import { FalProvider } from '../providers/fal';
import { CloudflareProvider } from '../providers/cloudflare';
import { MockProvider } from '../providers/mock';
import { saveImage, deleteImage } from '../services/storage';
import { logCost } from '../services/cost-tracker';
import { publishEvent } from '../services/events';
import { getPrisma } from '../services/prisma';

const PROVIDERS = {
  HUGGINGFACE: new HuggingFaceProvider(),
  FAL: new FalProvider(),
  CLOUDFLARE: new CloudflareProvider(),
  MOCK: new MockProvider(),
};

function resolveProvider(override?: string): Provider {
  if (override) {
    const up = override.toUpperCase() as Provider;
    if (PROVIDERS[up]) return up;
  }
  const env = (process.env.THUMBNAIL_DEFAULT_PROVIDER || 'MOCK').toUpperCase() as Provider;
  return PROVIDERS[env] ? env : 'MOCK';
}

export async function generateRoutes(app: FastifyInstance): Promise<void> {

  // ─── POST /thumbnails/generate ────────────────────────────────────────────
  app.post<{ Body: GenerateRequest }>('/thumbnails/generate', async (req, reply) => {
    const { prompt, negativePrompt, videoId, aspectRatio = 'LANDSCAPE_16_9', providerOverride } = req.body;
    if (!prompt?.trim()) return reply.status(400).send({ error: 'prompt is required' });

    const providerName = resolveProvider(providerOverride);
    const provider = PROVIDERS[providerName];
    const config = ASPECT_CONFIGS[aspectRatio];
    const prisma = getPrisma();

    const job = await prisma.thumbnailJob.create({
      data: {
        prompt, negativePrompt, videoId, aspectRatio,
        provider: providerName,
        model: 'pending',
        width: config.width,
        height: config.height,
        status: 'RUNNING',
      },
    });

    const t0 = Date.now();
    try {
      const result = await provider.generate(prompt, config, negativePrompt);
      const durationMs = Date.now() - t0;
      const { localPath, imageUrl } = await saveImage(job.id, result.imageBuffer);

      await prisma.thumbnailJob.update({
        where: { id: job.id },
        data: { status: 'DONE', model: result.model, imageUrl, localPath, costUsd: result.costUsd },
      });

      await logCost({ jobId: job.id, provider: providerName, model: result.model, costUsd: result.costUsd, responseMs: durationMs });
      await publishEvent('thumbnail.generated', { jobId: job.id, videoId, imageUrl, provider: providerName, model: result.model, durationMs, costUsd: result.costUsd });

      return reply.send({ jobId: job.id, imageUrl, provider: providerName, model: result.model, width: config.width, height: config.height, costUsd: result.costUsd, durationMs });

    } catch (err) {
      const errorMessage = (err as Error).message;
      await prisma.thumbnailJob.update({ where: { id: job.id }, data: { status: 'FAILED', errorMessage } });
      await publishEvent('thumbnail.failed', { jobId: job.id, videoId, provider: providerName, errorMessage });
      return reply.status(500).send({ error: 'Generation failed', details: errorMessage, jobId: job.id });
    }
  });

  // ─── GET /thumbnails ──────────────────────────────────────────────────────
  app.get<{ Querystring: { videoId?: string; provider?: string; status?: string; page?: string } }>(    '/thumbnails', async (req, reply) => {
    const { videoId, provider, status, page = '1' } = req.query;
    const skip = (parseInt(page) - 1) * 20;
    const where: Record<string, unknown> = {};
    if (videoId) where.videoId = videoId;
    if (provider) where.provider = provider.toUpperCase();
    if (status) where.status = status.toUpperCase();
    const prisma = getPrisma();
    const [data, total] = await Promise.all([
      prisma.thumbnailJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: 20 }),
      prisma.thumbnailJob.count({ where }),
    ]);
    return reply.send({ data, total, page: parseInt(page), perPage: 20 });
  });

  // ─── GET /thumbnails/:id ──────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/thumbnails/:id', async (req, reply) => {
    const job = await getPrisma().thumbnailJob.findUnique({
      where: { id: req.params.id },
      include: { costs: true },
    });
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    return reply.send(job);
  });

  // ─── DELETE /thumbnails/:id ───────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/thumbnails/:id', async (req, reply) => {
    const job = await getPrisma().thumbnailJob.findUnique({ where: { id: req.params.id } });
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    if (job.localPath) await deleteImage(job.localPath);
    await getPrisma().thumbnailJob.delete({ where: { id: req.params.id } });
    return reply.send({ success: true });
  });
}
