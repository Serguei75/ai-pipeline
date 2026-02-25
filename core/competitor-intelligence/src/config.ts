export const config = {
  port:               parseInt(process.env.PORT || '3011'),
  youtubeApiKey:      process.env.YOUTUBE_API_KEY || '',
  openaiApiKey:       process.env.OPENAI_API_KEY || '',
  redisHost:          process.env.REDIS_HOST || 'localhost',
  redisPort:          parseInt(process.env.REDIS_PORT || '6379'),
  syncIntervalHours:  parseInt(process.env.SYNC_INTERVAL_HOURS || '6'),
  videosPerChannel:   parseInt(process.env.VIDEOS_PER_CHANNEL || '50'),
  minViewVelocity:    parseFloat(process.env.MIN_VIEW_VELOCITY || '1000'),
}
