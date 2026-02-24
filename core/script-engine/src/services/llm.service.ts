import OpenAI from 'openai'
import { config } from '../config'
import { logger } from '../logger'
import { LLMError } from '../errors/app.errors'

interface LLMRequestOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
  requestId?: string
}

export interface LLMMeta {
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY })

export const llmService = {
  async generateJson<T>(options: LLMRequestOptions): Promise<{ parsed: T; meta: LLMMeta }> {
    const {
      prompt,
      maxTokens  = config.OPENAI_MAX_TOKENS,
      temperature = config.OPENAI_TEMPERATURE,
      requestId,
    } = options

    const log = logger.child({ requestId, service: 'llm' })
    log.info({ model: config.OPENAI_MODEL, maxTokens, temperature }, 'LLM request started')

    let response: OpenAI.Chat.ChatCompletion

    try {
      response = await client.chat.completions.create({
        model:           config.OPENAI_MODEL,
        messages:        [{ role: 'user', content: prompt }],
        max_tokens:      maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      })
    } catch (error) {
      log.error({ error }, 'OpenAI API call failed')
      throw new LLMError('OpenAI API request failed', error)
    }

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) throw new LLMError('Empty response from OpenAI')

    log.info(
      {
        promptTokens:     response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
      'LLM request completed',
    )

    let parsed: T
    try {
      parsed = JSON.parse(rawContent) as T
    } catch {
      log.error({ rawContent: rawContent.slice(0, 500) }, 'Failed to parse LLM JSON response')
      throw new LLMError('LLM returned invalid JSON')
    }

    return {
      parsed,
      meta: {
        model: response.model,
        usage: {
          promptTokens:     response.usage?.prompt_tokens     ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens:      response.usage?.total_tokens      ?? 0,
        },
      },
    }
  },
}
