export type ChannelType = 'FUEL' | 'INTELLECTUAL';
export type CommentType = 'QUESTION' | 'FEEDBACK' | 'PRAISE' | 'CRITICISM' | 'SPAM' | 'IDEA' | 'UNKNOWN';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type DraftStatus = 'NEW' | 'APPROVED' | 'EDITED' | 'SENT' | 'DECLINED';

export interface ClassifyResult {
  type: CommentType;
  sentiment: Sentiment;
  topic: string | null;
  tags: string[];
  language: string;
}

export interface ReplyDraftResult {
  proposedReply: string;
  promptVersion: string;
  generatedBy: string;
}

export interface YouTubeCommentSnippet {
  videoId: string;
  authorDisplayName: string;
  authorChannelId?: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  youtubeId: string;
  videoId: string;
  channelType: ChannelType;
  author: string;
  authorId?: string;
  text: string;
  likeCount?: number;
  publishedAt: Date;
}

export interface CommentFilters {
  channelType?: ChannelType;
  type?: CommentType;
  sentiment?: Sentiment;
  draftStatus?: DraftStatus;
  isProcessed?: boolean;
  page?: number;
  limit?: number;
}

export interface ApproveDraftDto {
  editedReply?: string;
  approvedBy: string;
}

export interface BrandVoiceConfig {
  brandName: string;
  tone: string[];
  avoid: string[];
  language: string;
}
