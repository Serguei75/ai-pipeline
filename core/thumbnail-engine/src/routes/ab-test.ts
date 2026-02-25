import { FastifyInstance } from 'fastify';
import { getPrisma } from '../services/prisma';
import { publishEvent } from '../services/events';
import { ASPECT_CONFIGS } from '../types';
import { HuggingFaceProvider } from '../providers/huggingface';
import { FalProvider } from '../providers/fal';
import { MockProvider } from '../providers/mock';
import { saveImage } from '../services/storage';
import { logCost } from '../services/cost-tracker';

// Шаблоны дополнений промпта для каждого типа хука
const HOOK_SUFFIXES: Record<string, string> = {
  fear:         'WARNING shocking revelation, danger red elements, urgent text, alarming',
  curiosity:    'mysterious question mark, hidden secret revealed, curious eyes, blue tones',
  surprise:     'explosive colors, unexpected twist, wide open eyes, jaw dropping, yellow burst',
  desire:       'aspirational success symbols, luxurious lifestyle, gold tones, achievement',
  social_proof: 'viral badge millions views, trending up arrow, crowd approval, green checkmark',
};

const DEFAULT_HOOKS = ['fear', 'curiosity', 'surprise'];

export async function abTestRoutes(app: FastifyInstance): Promise<void> {

  // POST /thumbnails/ab-test — создать A/B тест + сразу генерировать варианты
  app.post<{
    Body: {
      videoId: string;
      basePrompt: string;
      hookTypes?: string[];
      providerOverride?: string;
    };
  }>('/thumbnails/ab-test', async (req, reply) => {
    const { videoId, basePrompt, hookTypes = DEFAULT_HOOKS, providerOverride } = req.body;
    if (!videoId || !basePrompt) {
      return reply.status(400).send({ error: 'videoId and basePrompt are required' });
    }

    const prisma = getPrisma();
    const config  = ASPECT_CONFIGS.LANDSCAPE_16_9;
    const provName = (providerOverride?.toUpperCase() ?? process.env.THUMBNAIL_DEFAULT_PROVIDER ?? 'MOCK').toUpperCase();
    const providers: Record<string, any> = {
      HUGGINGFACE: new HuggingFaceProvider(),
      FAL:         new FalProvider(),
      MOCK:        new MockProvider(),
    };
    const provider = providers[provName] ?? providers.MOCK;

    // Создаём тест
    const test = await prisma.thumbnailABTest.create({
      data: { videoId, status: 'RUNNING' },
    });

    // Генерируем варианты параллельно
    const hooks = [...new Set(hookTypes)].slice(0, 5);
    const results = await Promise.allSettled(
      hooks.map(async (hookType) => {
        const suffix = HOOK_SUFFIXES[hookType] ?? hookType;
        const prompt = `${basePrompt}, ${suffix}, YouTube thumbnail, high contrast, bold text, CTV optimized`;

        const variant = await prisma.thumbnailABVariant.create({
          data: { testId: test.id, prompt, hookType, provider: provName as any },
        });

        try {
          const generated = await provider.generate(prompt, config);
          const { imageUrl, localPath } = await saveImage(variant.id, generated.imageBuffer);
          await prisma.thumbnailABVariant.update({
            where: { id: variant.id },
            data: { imageUrl, localPath },
          });
          if (generated.costUsd > 0) {
            await logCost({ jobId: variant.id, provider: provName, model: generated.model, costUsd: generated.costUsd });
          }
          return { variantId: variant.id, hookType, imageUrl, costUsd: generated.costUsd };
        } catch (e) {
          return { variantId: variant.id, hookType, imageUrl: null, error: (e as Error).message };
        }
      })
    );

    const variants = results.map(r =>
      r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason }
    );

    await publishEvent('thumbnail.ab_test_created', {
      testId: test.id, videoId, variantCount: hooks.length,
    });

    return reply.send({ testId: test.id, videoId, status: 'RUNNING', variants });
  });

  // GET /thumbnails/ab-tests — список тестов
  app.get<{ Querystring: { videoId?: string; status?: string } }>(
    '/thumbnails/ab-tests', async (req, reply) => {
      const { videoId, status } = req.query;
      const where: Record<string, unknown> = {};
      if (videoId) where.videoId = videoId;
      if (status)  where.status  = status.toUpperCase();
      const tests = await getPrisma().thumbnailABTest.findMany({
        where, include: { variants: true },
        orderBy: { createdAt: 'desc' }, take: 20,
      });
      return reply.send(tests);
    }
  );

  // GET /thumbnails/ab-tests/:testId
  app.get<{ Params: { testId: string } }>('/thumbnails/ab-tests/:testId', async (req, reply) => {
    const test = await getPrisma().thumbnailABTest.findUnique({
      where: { id: req.params.testId }, include: { variants: true },
    });
    if (!test) return reply.status(404).send({ error: 'Test not found' });
    return reply.send(test);
  });

  // PATCH /thumbnails/ab-tests/:testId/impression/:variantId — отметка показа
  app.patch<{ Params: { testId: string; variantId: string } }>(
    '/thumbnails/ab-tests/:testId/impression/:variantId', async (req, reply) => {
      await getPrisma().thumbnailABVariant.update({
        where: { id: req.params.variantId },
        data: { impressions: { increment: 1 } },
      });
      return reply.send({ ok: true });
    }
  );

  // PATCH /thumbnails/ab-tests/:testId/click/:variantId — отметка клика + CTR
  app.patch<{ Params: { testId: string; variantId: string } }>(
    '/thumbnails/ab-tests/:testId/click/:variantId', async (req, reply) => {
      const v = await getPrisma().thumbnailABVariant.update({
        where: { id: req.params.variantId }, data: { clicks: { increment: 1 } },
      });
      const ctr = v.impressions > 0 ? v.clicks / v.impressions : 0;
      await getPrisma().thumbnailABVariant.update({ where: { id: v.id }, data: { ctr } });
      return reply.send({ ok: true, ctr: ctr.toFixed(4) });
    }
  );

  // POST /thumbnails/ab-tests/:testId/winner — закрыть тест, выбрать победителя
  app.post<{ Params: { testId: string }; Body: { variantId?: string } }>(
    '/thumbnails/ab-tests/:testId/winner', async (req, reply) => {
      const { testId } = req.params;
      const prisma = getPrisma();
      const test = await prisma.thumbnailABTest.findUnique({
        where: { id: testId }, include: { variants: true },
      });
      if (!test) return reply.status(404).send({ error: 'Test not found' });

      // Авто-выбор по CTR если variantId не указан
      let winnerId = req.body.variantId;
      if (!winnerId) {
        const sorted = [...test.variants].sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0));
        winnerId = sorted[0]?.id;
      }
      if (!winnerId) return reply.status(400).send({ error: 'No variants available' });
      const winner = test.variants.find(v => v.id === winnerId);
      if (!winner) return reply.status(404).send({ error: 'Variant not found' });

      await prisma.thumbnailABTest.update({
        where: { id: testId },
        data: { status: 'COMPLETED', winnerId, winnerCtr: winner.ctr ?? 0 },
      });
      await prisma.thumbnailABVariant.update({
        where: { id: winnerId }, data: { isWinner: true },
      });

      await publishEvent('thumbnail.ab_test_winner', {
        testId, videoId: test.videoId,
        winnerId, winnerHookType: winner.hookType,
        winnerImageUrl: winner.imageUrl, winnerCtr: winner.ctr ?? 0,
      });

      return reply.send({
        testId, winnerId,
        hookType: winner.hookType,
        imageUrl: winner.imageUrl,
        ctr: winner.ctr ?? 0,
      });
    }
  );
}
