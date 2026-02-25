import { google } from 'googleapis'

const yt = google.youtube('v3')

export class YouTubeService {
  constructor(private apiKey: string) {}

  // Распарсиваем URL / ID / @handle в тип + значение
  resolveChannelId(input: string): { type: 'id' | 'handle' | 'username'; value: string } {
    const channelMatch = input.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/)
    if (channelMatch) return { type: 'id', value: channelMatch[1] }

    const handleInUrl = input.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/)
    if (handleInUrl) return { type: 'handle', value: handleInUrl[1] }

    const userMatch = input.match(/youtube\.com\/user\/([A-Za-z0-9_-]+)/)
    if (userMatch) return { type: 'username', value: userMatch[1] }

    if (input.startsWith('@')) return { type: 'handle', value: input.slice(1) }
    if (input.startsWith('UC') && input.length > 10) return { type: 'id', value: input }

    return { type: 'handle', value: input }
  }

  async getChannelById(channelId: string) {
    const res = await yt.channels.list({
      key: this.apiKey,
      part: ['snippet', 'statistics'],
      id: [channelId],
    })
    return res.data.items?.[0] ?? null
  }

  async resolveChannelByHandle(handle: string) {
    const res = await yt.channels.list({
      key: this.apiKey,
      part: ['snippet', 'statistics'],
      forHandle: handle,
    })
    return res.data.items?.[0] ?? null
  }

  async getChannelVideos(ytChannelId: string, maxResults = 50) {
    // 1. Получаем uploads playlist ID
    const chRes = await yt.channels.list({
      key: this.apiKey,
      part: ['contentDetails'],
      id: [ytChannelId],
    })
    const uploadsId = chRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsId) return []

    // 2. Получаем video IDs из playlist
    const plRes = await yt.playlistItems.list({
      key: this.apiKey,
      part: ['contentDetails'],
      playlistId: uploadsId,
      maxResults,
    })
    const videoIds = (plRes.data.items ?? [])
      .map(i => i.contentDetails?.videoId)
      .filter((id): id is string => !!id)

    if (!videoIds.length) return []

    // 3. Получаем статистику видео (батчами по 50)
    const chunks: string[][] = []
    for (let i = 0; i < videoIds.length; i += 50) chunks.push(videoIds.slice(i, i + 50))

    const allVideos = []
    for (const chunk of chunks) {
      const vRes = await yt.videos.list({
        key: this.apiKey,
        part: ['snippet', 'statistics', 'contentDetails'],
        id: chunk,
      })
      allVideos.push(...(vRes.data.items ?? []))
    }
    return allVideos
  }
}
