import { PrismaClient } from '@prisma/client'
import type { YouTubeService } from './youtube'
import type { EventPublisher } from './events'
import { config } from '../config'

export class SyncService {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private prisma: PrismaClient,
    private youtube: YouTubeService,
    private events: EventPublisher,
  ) {}

  async syncChannel(channelId: string): Promise<{ synced: number; trending: number }> {
    const channel = await this.prisma.competitorChannel.findUnique({ where: { id: channelId } })
    if (!channel) throw new Error(`Channel ${channelId} not found`)

    const ytVideos = await this.youtube.getChannelVideos(channel.channelId, config.videosPerChannel)
    const now = Date.now()
    let synced = 0
    let trending = 0

    for (const v of ytVideos) {
      const videoId = v.id!
      const publishedAt = new Date(v.snippet?.publishedAt ?? now)
      const daysSince = Math.max((now - publishedAt.getTime()) / 86_400_000, 0.1)
      const viewCount = parseInt(v.statistics?.viewCount ?? '0')
      const viewVelocity = viewCount / daysSince

      await this.prisma.competitorVideo.upsert({
        where: { videoId },
        create: {
          channelId,
          videoId,
          title: v.snippet?.title ?? '',
          description: v.snippet?.description ?? null,
          thumbnailUrl:
            v.snippet?.thumbnails?.maxres?.url ??
            v.snippet?.thumbnails?.high?.url ??
            v.snippet?.thumbnails?.default?.url ?? null,
          publishedAt,
          viewCount,
          likeCount: parseInt(v.statistics?.likeCount ?? '0'),
          commentCount: parseInt(v.statistics?.commentCount ?? '0'),
          duration: v.contentDetails?.duration ?? null,
          tags: v.snippet?.tags ?? [],
          viewVelocity,
        },
        update: {
          viewCount,
          likeCount: parseInt(v.statistics?.likeCount ?? '0'),
          commentCount: parseInt(v.statistics?.commentCount ?? '0'),
          viewVelocity,
        },
      })
      synced++

      // Публикуем событие для трендовых видео
      if (viewVelocity >= config.minViewVelocity) {
        trending++
        await this.events.publish('competitor.trend_detected', {
          channelId,
          channelName: channel.name,
          channelNiche: channel.niche,
          videoId,
          title: v.snippet?.title,
          viewVelocity: Math.round(viewVelocity),
          viewCount,
        })
      }
    }

    await this.prisma.competitorChannel.update({
      where: { id: channelId },
      data: { lastSyncAt: new Date() },
    })

    console.log(`✅ Sync [${channel.name}]: ${synced} videos, ${trending} trending`)
    return { synced, trending }
  }

  async syncAll(): Promise<void> {
    const channels = await this.prisma.competitorChannel.findMany({ where: { isActive: true } })
    console.log(`🔄 Syncing ${channels.length} channels...`)
    for (const ch of channels) {
      try {
        await this.syncChannel(ch.id)
      } catch (e) {
        console.error(`❌ Sync failed [${ch.name}]:`, (e as Error).message)
      }
    }
  }

  start() {
    const ms = config.syncIntervalHours * 3_600_000
    this.timer = setInterval(() => void this.syncAll(), ms)
    console.log(`⏰ Sync scheduler started — every ${config.syncIntervalHours}h`)
    // Первая синхронизация через 10с после запуска
    setTimeout(() => void this.syncAll(), 10_000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }
}
