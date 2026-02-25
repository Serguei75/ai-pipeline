import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import axios from 'axios';
import { ClassifyResult, ReplyDraftResult, CreateCommentDto, CommentFilters, BrandVoiceConfig } from '../types';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CLASSIFY_PROMPT = `You are a YouTube comment classifier. Analyze the comment and return JSON:
{
  "type": "QUESTION|FEEDBACK|PRAISE|CRITICISM|SPAM|IDEA|UNKNOWN",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
  "topic": "brief topic string or null",
  "tags": ["tag1", "tag2"],
  "language": "ISO 639-1 code"
}
Return ONLY valid JSON, no markdown.`;

const REPLY_PROMPT = (brandConfig: BrandVoiceConfig, commentText: string, commentType: string) =>
  `You are a community manager for YouTube channel "${brandConfig.brandName}".
Tone: ${brandConfig.tone.join(', ')}.
Avoid: ${brandConfig.avoid.join(', ')}.
Comment type: ${commentType}

Write a helpful reply to this comment (max 150 words, natural and friendly, in same language as comment):
"${commentText}"

Return ONLY the reply text, no quotes, no markdown.`;

export class CommentService {
  async syncFromYouTube(videoYoutubeId: string): Promise<number> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

    let pageToken: string | undefined;
    let synced = 0;

    do {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoYoutubeId}&maxResults=100&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const { data } = await axios.get(url);

      // Find or create video record
      let video = await prisma.youtubeVideo.findUnique({ where: { youtubeId: videoYoutubeId } });
      if (!video) {
        video = await prisma.youtubeVideo.create({
          data: {
            youtubeId: videoYoutubeId,
            title: 'Unknown (sync from API)',
            channelType: 'INTELLECTUAL',
            publishedAt: new Date(),
          },
        });
      }

      for (const item of data.items || []) {
        const s = item.snippet?.topLevelComment?.snippet;
        if (!s) continue;

        await prisma.comment.upsert({
          where: { youtubeId: item.id },
          update: { likeCount: s.likeCount || 0 },
          create: {
            youtubeId: item.id,
            videoId: video.id,
            channelType: video.channelType,
            author: s.authorDisplayName,
            authorId: s.authorChannelId?.value,
            text: s.textOriginal,
            likeCount: s.likeCount || 0,
            publishedAt: new Date(s.publishedAt),
          },
        });
        synced++;
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    await prisma.syncLog.create({ data: { videoId: videoYoutubeId, syncedCount: synced } });
    return synced;
  }

  async classifyPendingComments(batchSize = 20): Promise<number> {
    const comments = await prisma.comment.findMany({
      where: { isProcessed: false },
      take: batchSize,
      orderBy: { publishedAt: 'desc' },
    });

    let processed = 0;
    for (const comment of comments) {
      try {
        const result = await this.classifyComment(comment.text);
        await prisma.comment.update({
          where: { id: comment.id },
          data: {
            type: result.type,
            sentiment: result.sentiment,
            topic: result.topic,
            tags: result.tags,
            language: result.language,
            isProcessed: true,
          },
        });

        // Auto-generate reply draft for QUESTION type
        if (result.type === 'QUESTION' || result.type === 'FEEDBACK') {
          await this.generateReplyDraft(comment.id, comment.text, result.type);
        }

        processed++;
      } catch (err) {
        console.error(`Failed to classify comment ${comment.id}:`, err);
      }
    }

    await this.extractTopicSuggestions();
    return processed;
  }

  private async classifyComment(text: string): Promise<ClassifyResult> {
    const truncated = text.slice(0, 1000);
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: truncated },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const raw = response.choices[0].message.content || '{}';
    return JSON.parse(raw) as ClassifyResult;
  }

  private async generateReplyDraft(commentId: string, text: string, type: string): Promise<void> {
    const brandConfig: BrandVoiceConfig = {
      brandName: process.env.BRAND_NAME || 'YourChannel',
      tone: (process.env.BRAND_TONE || 'professional,helpful').split(','),
      avoid: (process.env.BRAND_AVOID || 'politics,religion').split(','),
      language: 'en',
    };

    const prompt = REPLY_PROMPT(brandConfig, text.slice(0, 500), type);
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const proposedReply = response.choices[0].message.content?.trim() || '';
    if (!proposedReply) return;

    await prisma.commentReplyDraft.upsert({
      where: { commentId },
      update: { proposedReply },
      create: {
        commentId,
        proposedReply,
        generatedBy: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        promptVersion: 'v1',
      },
    });
  }

  async getComments(filters: CommentFilters) {
    const { channelType, type, sentiment, draftStatus, isProcessed, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (channelType) where.channelType = channelType;
    if (type) where.type = type;
    if (sentiment) where.sentiment = sentiment;
    if (isProcessed !== undefined) where.isProcessed = isProcessed;

    if (draftStatus) {
      where.replyDraft = { status: draftStatus };
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        include: { replyDraft: true, video: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.comment.count({ where }),
    ]);

    return { comments, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async approveDraft(draftId: string, dto: { editedReply?: string; approvedBy: string }) {
    const finalReply = dto.editedReply;
    return prisma.commentReplyDraft.update({
      where: { id: draftId },
      data: {
        status: 'APPROVED',
        editedReply: dto.editedReply,
        finalReply: finalReply,
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async declineDraft(draftId: string, reason?: string) {
    return prisma.commentReplyDraft.update({
      where: { id: draftId },
      data: { status: 'DECLINED', declineReason: reason },
    });
  }

  async getTopicSuggestions(exported = false) {
    return prisma.topicSuggestion.findMany({
      where: { exportedAt: exported ? { not: null } : null },
      orderBy: { frequency: 'desc' },
      take: 50,
    });
  }

  async exportTopicToEngine(suggestionId: string) {
    const suggestion = await prisma.topicSuggestion.findUniqueOrThrow({ where: { id: suggestionId } });
    const topicEngineUrl = process.env.TOPIC_ENGINE_URL || 'http://localhost:3001';

    const response = await axios.post(`${topicEngineUrl}/topics`, {
      title: suggestion.question,
      niche: 'education',
      channelType: suggestion.channelType,
      source: 'community-comments',
      language: suggestion.language,
    });

    await prisma.topicSuggestion.update({
      where: { id: suggestionId },
      data: { exportedAt: new Date(), exportedToTopicId: response.data?.id },
    });

    return response.data;
  }

  private async extractTopicSuggestions(): Promise<void> {
    const questions = await prisma.comment.findMany({
      where: { type: 'QUESTION', isProcessed: true, topic: { not: null } },
      select: { topic: true, channelType: true, language: true },
    });

    const frequencyMap = new Map<string, { count: number; channelType: string; language: string }>();
    for (const q of questions) {
      if (!q.topic) continue;
      const key = q.topic.toLowerCase();
      const existing = frequencyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        frequencyMap.set(key, { count: 1, channelType: q.channelType, language: q.language });
      }
    }

    for (const [question, data] of frequencyMap.entries()) {
      if (data.count < 2) continue; // only recurring questions
      await prisma.topicSuggestion.upsert({
        where: { id: question }, // simplified — in prod use compound unique
        update: { frequency: data.count },
        create: {
          question,
          frequency: data.count,
          channelType: data.channelType as 'FUEL' | 'INTELLECTUAL',
          language: data.language,
        },
      });
    }
  }

  async getStats() {
    const [total, byType, bySentiment, pendingDrafts] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.groupBy({ by: ['type'], _count: true }),
      prisma.comment.groupBy({ by: ['sentiment'], _count: true }),
      prisma.commentReplyDraft.count({ where: { status: 'NEW' } }),
    ]);
    return { total, byType, bySentiment, pendingDrafts };
  }
}
