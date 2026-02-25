import { FastifyInstance } from 'fastify';
import { CommentService } from '../services/comment.service';

const service = new CommentService();

export async function commentRoutes(fastify: FastifyInstance) {
  // GET /comments — list with filters
  fastify.get('/comments', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const result = await service.getComments({
      channelType: q.channelType as 'FUEL' | 'INTELLECTUAL' | undefined,
      type: q.type as 'QUESTION' | undefined,
      sentiment: q.sentiment as 'POSITIVE' | undefined,
      draftStatus: q.draftStatus as 'NEW' | undefined,
      isProcessed: q.isProcessed !== undefined ? q.isProcessed === 'true' : undefined,
      page: q.page ? parseInt(q.page) : 1,
      limit: q.limit ? parseInt(q.limit) : 20,
    });
    return reply.send(result);
  });

  // POST /sync — pull comments from YouTube API
  fastify.post('/sync', async (req, reply) => {
    const { videoYoutubeId } = req.body as { videoYoutubeId: string };
    if (!videoYoutubeId) return reply.status(400).send({ error: 'videoYoutubeId required' });
    const synced = await service.syncFromYouTube(videoYoutubeId);
    return reply.send({ synced, videoYoutubeId });
  });

  // POST /classify — process pending comments with AI
  fastify.post('/classify', async (req, reply) => {
    const { batchSize = 20 } = (req.body as Record<string, number>) || {};
    const processed = await service.classifyPendingComments(batchSize);
    return reply.send({ processed });
  });

  // GET /drafts — get reply drafts
  fastify.get('/drafts', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const result = await service.getComments({
      draftStatus: (q.status as 'NEW' | 'APPROVED' | 'EDITED' | 'SENT' | 'DECLINED') || 'NEW',
      page: q.page ? parseInt(q.page) : 1,
      limit: q.limit ? parseInt(q.limit) : 20,
    });
    return reply.send(result);
  });

  // PUT /drafts/:id/approve
  fastify.put('/drafts/:id/approve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { editedReply?: string; approvedBy: string };
    const updated = await service.approveDraft(id, body);
    return reply.send(updated);
  });

  // PUT /drafts/:id/decline
  fastify.put('/drafts/:id/decline', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const updated = await service.declineDraft(id, reason);
    return reply.send(updated);
  });

  // GET /topics — extracted topic suggestions from comments
  fastify.get('/topics', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const topics = await service.getTopicSuggestions(q.exported === 'true');
    return reply.send({ topics });
  });

  // POST /topics/:id/export — push topic to Topic Engine
  fastify.post('/topics/:id/export', async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await service.exportTopicToEngine(id);
    return reply.send({ success: true, topicEngineResult: result });
  });

  // GET /stats
  fastify.get('/stats', async (_req, reply) => {
    const stats = await service.getStats();
    return reply.send(stats);
  });
}
