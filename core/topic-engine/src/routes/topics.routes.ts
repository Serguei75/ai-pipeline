// core/topic-engine/src/routes/topics.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TopicService } from '../services/topic.service';
import { CreateTopicDTO, UpdateTopicDTO, TopicFilters, TopicStatus } from '../types';

export async function topicRoutes(fastify: FastifyInstance) {
  const topicService = new TopicService(fastify.prisma);

  // GET /api/topics
  fastify.get('/api/topics', async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as TopicFilters & { page?: number; limit?: number };
    const { page = 1, limit = 20, ...topicFilters } = filters;
    const result = await topicService.listTopics(topicFilters, Number(page), Number(limit));
    return reply.send(result);
  });

  // GET /api/topics/:id
  fastify.get('/api/topics/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const topic = await topicService.getTopicById(request.params.id);
    if (!topic) return reply.status(404).send({ error: 'Topic not found' });
    return reply.send(topic);
  });

  // POST /api/topics
  fastify.post('/api/topics', async (
    request: FastifyRequest<{ Body: CreateTopicDTO }>,
    reply: FastifyReply
  ) => {
    const topic = await topicService.createTopic(request.body);
    return reply.status(201).send(topic);
  });

  // PATCH /api/topics/:id
  fastify.patch('/api/topics/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTopicDTO }>,
    reply: FastifyReply
  ) => {
    const topic = await topicService.updateTopic(request.params.id, request.body);
    return reply.send(topic);
  });

  // POST /api/topics/:id/approve
  fastify.post('/api/topics/:id/approve', async (
    request: FastifyRequest<{ Params: { id: string }; Body: { approvedBy?: string } }>,
    reply: FastifyReply
  ) => {
    const topic = await topicService.approveTopic(request.params.id, request.body?.approvedBy);
    return reply.send(topic);
  });

  // POST /api/topics/:id/reject
  fastify.post('/api/topics/:id/reject', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const topic = await topicService.rejectTopic(request.params.id);
    return reply.send(topic);
  });

  // POST /api/topics/generate
  fastify.post('/api/topics/generate', async (
    request: FastifyRequest<{ Body: { niche: string; targetMarkets?: string[]; count?: number } }>,
    reply: FastifyReply
  ) => {
    const { niche, targetMarkets = ['US'], count = 5 } = request.body;
    const topics = await topicService.generateTopics(niche, targetMarkets, count);
    return reply.send({ topics, count: topics.length });
  });
}
