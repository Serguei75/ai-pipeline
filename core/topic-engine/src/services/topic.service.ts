// core/topic-engine/src/services/topic.service.ts

import { PrismaClient } from '@prisma/client';
import { TopicCandidate, CreateTopicDTO, UpdateTopicDTO, TopicFilters, TopicStatus, Niche } from '../types';

export class TopicService {
  constructor(private prisma: PrismaClient) {}

  async listTopics(filters: TopicFilters, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.niche) where.niche = filters.niche;
    if (filters.source) where.source = filters.source;
    if (filters.forShort !== undefined) where.forShort = filters.forShort;
    if (filters.forDeep !== undefined) where.forDeep = filters.forDeep;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [topics, total] = await Promise.all([
      this.prisma.topicCandidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.topicCandidate.count({ where }),
    ]);

    return {
      topics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopicById(id: string): Promise<TopicCandidate | null> {
    return this.prisma.topicCandidate.findUnique({ where: { id } });
  }

  async createTopic(data: CreateTopicDTO): Promise<TopicCandidate> {
    return this.prisma.topicCandidate.create({
      data: {
        title: data.title,
        description: data.description,
        niche: data.niche,
        source: data.source,
        targetMarkets: data.targetMarkets,
        forShort: data.forShort ?? true,
        forDeep: data.forDeep ?? true,
        keywords: data.keywords || [],
        sourceUrl: data.sourceUrl,
        sourceData: data.sourceData,
      },
    });
  }

  async updateTopic(id: string, data: UpdateTopicDTO): Promise<TopicCandidate> {
    return this.prisma.topicCandidate.update({ where: { id }, data });
  }

  async approveTopic(id: string, approvedBy?: string): Promise<TopicCandidate> {
    return this.prisma.topicCandidate.update({
      where: { id },
      data: {
        status: TopicStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }

  async rejectTopic(id: string): Promise<TopicCandidate> {
    return this.prisma.topicCandidate.update({
      where: { id },
      data: { status: TopicStatus.REJECTED },
    });
  }

  async generateTopics(niche: string, targetMarkets: string[], count: number): Promise<TopicCandidate[]> {
    const sources = ['YOUTUBE_TRENDS', 'GOOGLE_TRENDS', 'REDDIT_API', 'TWITTER_API'];
    const mockTopics: CreateTopicDTO[] = [
      {
        title: `${niche} Revolution 2026`,
        description: `Latest trends and innovations in ${niche}`,
        niche: niche as Niche,
        source: sources[0] as any,
        targetMarkets,
        keywords: [niche.toLowerCase(), '2026', 'trends', 'innovation'],
      },
      {
        title: `How to Master ${niche} in 2026`,
        description: `Complete guide for ${niche} professionals`,
        niche: niche as Niche,
        source: sources[1] as any,
        targetMarkets,
        keywords: [niche.toLowerCase(), 'guide', 'tutorial', 'master'],
      },
      {
        title: `${niche} Secrets Nobody Tells You`,
        description: `Hidden insights and tips about ${niche}`,
        niche: niche as Niche,
        source: sources[2] as any,
        targetMarkets,
        keywords: [niche.toLowerCase(), 'secrets', 'tips', 'hidden'],
      },
    ];

    return Promise.all(
      mockTopics.slice(0, count).map(topic => this.createTopic(topic))
    );
  }
}
