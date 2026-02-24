import OpenAI from 'openai'
import { config } from '../config.js'
import { logger } from '../logger.js'

export interface CompletionResult {
  content: string
  tokensUsed: number
  model: string
}

export class OpenAIService {
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    })
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: { model?: string; temperature?: number }
  ): Promise<CompletionResult> {
    const model = options?.model ?? config.OPENAI_MODEL
    const temperature = options?.temperature ?? 0.8

    logger.debug({ model, promptLength: userPrompt.length }, 'Sending completion request')

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    const tokensUsed = response.usage?.total_tokens ?? 0

    logger.info({
      model,
      tokensUsed,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    }, 'OpenAI completion successful')

    return { content, tokensUsed, model }
  }
}
