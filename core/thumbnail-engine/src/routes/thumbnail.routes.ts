import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ThumbnailService } from '../services/thumbnail.service.js';

const thumbnailService = new ThumbnailService();

const generateSchema = z.object({
  videoTitle:    z.string().min(1),
  hookText:      z.string().min(1),
  hookEmotion:   z.string(),
  niche:         z.string(),
  targetMarket:  z.string(),
  channelType:   z.enum(['FUEL', 'INTELLECTUAL']),
  variants:      z.number().min(1).max(4).default(3),
  aspectRatios:  z.array(z.enum(['16:9', '1:1', '9:16'])).default(['16:9']),
  draft:         z.boolean().default(false),
});

export async function thumbnailRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /thumbnails/generate
   * Generate N thumbnail variants for a video.
   * Default: 3 Imagen 4 variants + 1 GPT Image 1.5 A/B = $0.10 per video
   */
  app.post('/thumbnails/generate', async (request, reply) => {
    const body = generateSchema.parse(request.body);

    const result = await thumbnailService.generate(body);
    return reply.code(201).send(result);
  });

  /**
   * POST /thumbnails/:variantId/upgrade-ultra
   * Upgrade a specific variant to Imagen 4 Ultra ($0.06, max quality).
   * Use after A/B test winner is determined.
   */
  app.post('/thumbnails/:variantId/upgrade-ultra', async (request, reply) => {
    const { variantId } = request.params as { variantId: string };
    const { prompt, aspectRatio } = request.body as {
      prompt: string;
      aspectRatio?: '16:9' | '1:1' | '9:16';
    };

    const variant = await thumbnailService.upgradeToUltra(variantId, prompt, aspectRatio);
    return reply.code(200).send(variant);
  });

  /** GET /thumbnails/providers — list available providers with pricing */
  app.get('/thumbnails/providers', async (_req, reply) => {
    const { PROVIDER_CONFIG } = await import('../config.js');
    return reply.send(
      Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => ({
        key,
        ...cfg,
        note:
          key === 'imagen4-fast'    ? 'Default. Batch API = $0.01/img' :
          key === 'imagen4-standard' ? 'Production quality tier' :
          key === 'imagen4-ultra'    ? 'Max quality, use for final approved video' :
          key === 'gpt-image-1.5'   ? 'Highest Arena Elo (1264), best for A/B winner' : '',
      }))
    );
  });
}
