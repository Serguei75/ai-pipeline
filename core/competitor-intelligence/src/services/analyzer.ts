import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface VideoSummary {
  title: string
  viewVelocity: number | null
  viewCount: number
  tags: string[]
}

interface GeneratedIdea {
  title: string
  angle: string
  hookType: string
  estimatedCpm: number
  priority: string
}

interface AnalysisResult {
  ideas: GeneratedIdea[]
  trends: string[]
}

export class AnalyzerService {
  async analyzeAndGenerateIdeas(
    videos: VideoSummary[],
    channelName: string,
  ): Promise<AnalysisResult> {
    const top = videos
      .sort((a, b) => (b.viewVelocity ?? 0) - (a.viewVelocity ?? 0))
      .slice(0, 20)

    const videoList = top
      .map((v, i) =>
        `${i + 1}. "${v.title}" — ${Math.round(v.viewVelocity ?? 0)} views/day, ` +
        `${v.viewCount.toLocaleString()} total${v.tags.length ? ` [${v.tags.slice(0, 3).join(', ')}]` : ''}`
      )
      .join('\n')

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a YouTube content strategist specializing in AI-related channels. ' +
            'Analyze competitor videos and generate original topic ideas inspired by their success patterns. ' +
            'Return JSON: { "ideas": [...], "trends": [...] }',
        },
        {
          role: 'user',
          content:
            `Competitor channel: "${channelName}"\n\n` +
            `Top performing videos (sorted by view velocity = views/day):\n${videoList}\n\n` +
            `Generate exactly 5 UNIQUE topic ideas. Each idea must DIFFER in angle from the source. ` +
            `For each idea provide:\n` +
            `- title (string): compelling YouTube title\n` +
            `- angle (string): what makes OUR video unique vs competitor\n` +
            `- hookType (string): one of fear|curiosity|surprise|desire|social_proof\n` +
            `- estimatedCpm (number): estimated CPM in USD (1-15)\n` +
            `- priority (string): HIGH|MEDIUM|LOW\n\n` +
            `Also return "trends": array of 3 short trend descriptions observed in this channel's content.`,
        },
      ],
    })

    try {
      return JSON.parse(response.choices[0].message.content || '{"ideas":[],"trends":[]}')
    } catch {
      return { ideas: [], trends: [] }
    }
  }
}
