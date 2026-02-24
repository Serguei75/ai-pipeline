// YouTube Service — Data API v3 + Analytics API
// Data API (API key): views, likes, comments, channel stats
// Analytics API (OAuth2): CPM, revenue, watch time, retention

import { config } from '../config.js'
import { logger } from '../logger.js'

export interface VideoStats {
  videoId: string
  title: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface VideoAnalytics {
  views: number
  estimatedRevenue: number
  estimatedCpm: number
  estimatedRpm: number
  adImpressions: number
  watchTimeMinutes: number
  avgViewDurationSec: number
  avgViewPercentage: number
  subscribersGained: number
  impressions: number
  clickThroughRate: number
}

export interface ChannelStats {
  subscriberCount: number
  viewCount: number
  videoCount: number
}

export class YouTubeService {
  private readonly dataBase = 'https://www.googleapis.com/youtube/v3'
  private readonly analyticsBase = 'https://youtubeanalytics.googleapis.com/v2'

  // Get current OAuth2 token (simple in-memory approach)
  // In production: implement refresh token flow
  private get oauthToken(): string | undefined {
    return config.YOUTUBE_OAUTH_TOKEN
  }

  async getVideoStats(videoId: string): Promise<VideoStats> {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoId,
      key: config.YOUTUBE_API_KEY,
    })

    const response = await fetch(`${this.dataBase}/videos?${params}`)

    if (!response.ok) {
      throw new Error(`YouTube Data API error [${response.status}]: ${await response.text()}`)
    }

    const data = await response.json() as {
      items: Array<{
        snippet: { title: string; publishedAt: string }
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
      }>
    }

    const item = data.items[0]
    if (!item) throw new Error(`Video not found: ${videoId}`)

    return {
      videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount ?? '0', 10),
      likeCount: parseInt(item.statistics.likeCount ?? '0', 10),
      commentCount: parseInt(item.statistics.commentCount ?? '0', 10),
    }
  }

  async getVideoAnalytics(
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<VideoAnalytics | null> {
    if (!this.oauthToken) {
      logger.warn('YOUTUBE_OAUTH_TOKEN not set — Analytics API (CPM/revenue) unavailable')
      return null
    }

    const params = new URLSearchParams({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: [
        'views',
        'estimatedRevenue',
        'estimatedCpm',
        'estimatedRpm',
        'adImpressions',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'averageViewPercentage',
        'subscribersGained',
        'impressions',
        'impressionsClickThroughRate',
      ].join(','),
      filters: `video==${videoId}`,
      dimensions: 'video',
    })

    const response = await fetch(`${this.analyticsBase}/reports?${params}`, {
      headers: { Authorization: `Bearer ${this.oauthToken}` },
    })

    if (!response.ok) {
      logger.error({ status: response.status, videoId }, 'YouTube Analytics API error')
      return null
    }

    const data = await response.json() as {
      rows?: Array<Array<string | number>>
    }

    if (!data.rows || data.rows.length === 0) {
      logger.warn({ videoId }, 'YouTube Analytics: no data rows returned')
      return null
    }

    const [, views, revenue, cpm, rpm, adImpressions, watchMin, avgDur, avgPct, subs, impressions, ctr] = data.rows[0]
    return {
      views: Number(views ?? 0),
      estimatedRevenue: Number(revenue ?? 0),
      estimatedCpm: Number(cpm ?? 0),
      estimatedRpm: Number(rpm ?? 0),
      adImpressions: Number(adImpressions ?? 0),
      watchTimeMinutes: Number(watchMin ?? 0),
      avgViewDurationSec: Number(avgDur ?? 0),
      avgViewPercentage: Number(avgPct ?? 0),
      subscribersGained: Number(subs ?? 0),
      impressions: Number(impressions ?? 0),
      clickThroughRate: Number(ctr ?? 0),
    }
  }

  async getChannelStats(channelId: string): Promise<ChannelStats> {
    const params = new URLSearchParams({
      part: 'statistics',
      id: channelId,
      key: config.YOUTUBE_API_KEY,
    })

    const response = await fetch(`${this.dataBase}/channels?${params}`)
    if (!response.ok) throw new Error(`YouTube channel stats error [${response.status}]`)

    const data = await response.json() as {
      items: Array<{
        statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string }
      }>
    }

    const item = data.items[0]
    if (!item) throw new Error(`Channel not found: ${channelId}`)

    return {
      subscriberCount: parseInt(item.statistics.subscriberCount ?? '0', 10),
      viewCount: parseInt(item.statistics.viewCount ?? '0', 10),
      videoCount: parseInt(item.statistics.videoCount ?? '0', 10),
    }
  }

  async getChannelVideos(channelId: string, maxResults = 50): Promise<string[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId,
      maxResults: String(maxResults),
      order: 'date',
      type: 'video',
      key: config.YOUTUBE_API_KEY,
    })

    const response = await fetch(`${this.dataBase}/search?${params}`)
    if (!response.ok) throw new Error(`YouTube channel videos error [${response.status}]`)

    const data = await response.json() as {
      items: Array<{ id: { videoId: string } }>
    }

    return data.items.map((item) => item.id.videoId).filter(Boolean)
  }
}
