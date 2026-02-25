import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import { CreateTaskDto, TranslateResult, MetadataResult, SrtEntry, LocalizationPackage } from '../types'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), 'output')

// ─────────────────────────────────────────────
// Language display names for ElevenLabs hints
// ─────────────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  de: 'German', es: 'Spanish', ja: 'Japanese',
  fr: 'French', pt: 'Portuguese', ru: 'Russian',
  zh: 'Chinese', ko: 'Korean', ar: 'Arabic', it: 'Italian',
}

export class LocalizationService {
  // ── CREATE ──────────────────────────────────
  async createTask(dto: CreateTaskDto) {
    const task = await prisma.localizationTask.create({
      data: {
        youtubeVideoId: dto.youtubeVideoId,
        title: dto.title,
        sourceLang: dto.sourceLang ?? 'en',
        targetLangs: dto.targetLangs,
        mode: dto.mode ?? 'SUBTITLES',
        scriptText: dto.scriptText,
        durationSeconds: dto.durationSeconds,
      },
    })
    return task
  }

  // ── STAGE 1: Subtitles + Metadata ───────────
  async processStage1(taskId: string): Promise<void> {
    const task = await prisma.localizationTask.findUniqueOrThrow({
      where: { id: taskId },
    })

    await prisma.localizationTask.update({
      where: { id: taskId },
      data: { status: 'STAGE1_PROCESSING' },
    })

    try {
      for (const lang of task.targetLangs) {
        // 1. Generate subtitles (.srt)
        if (task.scriptText) {
          const srtPath = await this.generateSubtitles(taskId, lang, task.scriptText, task.durationSeconds ?? 600)
          await this.upsertAsset(taskId, lang, 'SUBTITLES', srtPath)
        }

        // 2. Generate localized metadata
        const metadata = await this.translateMetadata(lang, task.title, task.scriptText ?? '')
        const metaJson = JSON.stringify(metadata)
        await this.upsertAsset(taskId, lang, 'METADATA', null, metaJson)
      }

      const nextStatus = task.mode === 'SUBTITLES' ? 'COMPLETED' : 'STAGE1_DONE'
      await prisma.localizationTask.update({
        where: { id: taskId },
        data: { status: nextStatus },
      })
    } catch (err) {
      await prisma.localizationTask.update({
        where: { id: taskId },
        data: { status: 'FAILED', errorLog: String(err) },
      })
      throw err
    }
  }

  // ── STAGE 2: TTS Dubbing ────────────────────
  async processStage2(taskId: string): Promise<void> {
    const task = await prisma.localizationTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { assets: true },
    })

    if (!task.scriptText) throw new Error('scriptText is required for Stage 2 dubbing')

    await prisma.localizationTask.update({
      where: { id: taskId },
      data: { status: 'STAGE2_PROCESSING' },
    })

    try {
      for (const lang of task.targetLangs) {
        // Get translated text (from METADATA asset or re-translate)
        const metaAsset = task.assets.find((a) => a.language === lang && a.assetType === 'METADATA')
        let translatedText = task.scriptText

        if (metaAsset?.contentJson) {
          // Re-translate script using OpenAI
          const translation = await this.translateScript(lang, task.scriptText)
          translatedText = translation.translatedText
        } else {
          const translation = await this.translateScript(lang, task.scriptText)
          translatedText = translation.translatedText
        }

        // Generate audio via ElevenLabs
        const audioPath = await this.generateDubbedAudio(taskId, lang, translatedText)
        await this.upsertAsset(taskId, lang, 'AUDIO', audioPath)
      }

      await prisma.localizationTask.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' },
      })
    } catch (err) {
      await prisma.localizationTask.update({
        where: { id: taskId },
        data: { status: 'FAILED', errorLog: String(err) },
      })
      throw err
    }
  }

  // ── PACKAGE ──────────────────────────────────
  async getPackage(taskId: string): Promise<LocalizationPackage> {
    const task = await prisma.localizationTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { assets: true },
    })

    const byLang = new Map<string, { subtitlePath?: string; audioPath?: string; metadata?: MetadataResult }>()

    for (const asset of task.assets) {
      if (!byLang.has(asset.language)) byLang.set(asset.language, {})
      const entry = byLang.get(asset.language)!

      if (asset.assetType === 'SUBTITLES') entry.subtitlePath = asset.filePath ?? undefined
      if (asset.assetType === 'AUDIO') entry.audioPath = asset.filePath ?? undefined
      if (asset.assetType === 'METADATA' && asset.contentJson) {
        entry.metadata = JSON.parse(asset.contentJson)
      }
    }

    return {
      taskId,
      youtubeVideoId: task.youtubeVideoId,
      languages: task.targetLangs,
      assets: Array.from(byLang.entries()).map(([lang, data]) => ({ language: lang, ...data })),
    }
  }

  async listTasks(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where = status ? { status: status as 'PENDING' } : {}
    const [tasks, total] = await Promise.all([
      prisma.localizationTask.findMany({
        where,
        skip,
        take: limit,
        include: { assets: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.localizationTask.count({ where }),
    ])
    return { tasks, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async getTask(id: string) {
    return prisma.localizationTask.findUniqueOrThrow({
      where: { id },
      include: { assets: true },
    })
  }

  // ── PRIVATE HELPERS ──────────────────────────

  private async translateScript(targetLang: string, text: string): Promise<TranslateResult> {
    const langName = LANG_NAMES[targetLang] ?? targetLang
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following script to ${langName}. 
Preserve the structure, tone, and formatting. Return ONLY the translated text, nothing else.`,
        },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })
    return {
      language: targetLang,
      translatedText: response.choices[0].message.content?.trim() ?? text,
    }
  }

  private async translateMetadata(targetLang: string, title: string, description: string): Promise<MetadataResult> {
    const langName = LANG_NAMES[targetLang] ?? targetLang
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a YouTube SEO specialist. Translate and localize metadata to ${langName}. Return JSON:
{"title": "...", "description": "...", "tags": ["tag1", "tag2", ...]}
Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nDescription: ${description.slice(0, 1000)}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    })
    const raw = response.choices[0].message.content?.trim() ?? '{}'
    const parsed = JSON.parse(raw)
    return { language: targetLang, ...parsed }
  }

  private async generateSubtitles(
    taskId: string,
    lang: string,
    scriptText: string,
    durationSeconds: number,
  ): Promise<string> {
    // Translate script first
    const { translatedText } = await this.translateScript(lang, scriptText)

    // Split into timed segments (naive: equal time distribution)
    const sentences = translatedText.split(/(?<=[.!?])\s+/).filter(Boolean)
    const timePerSentence = durationSeconds / Math.max(sentences.length, 1)

    const entries: SrtEntry[] = sentences.map((text, i) => ({
      index: i + 1,
      start: this.formatSrtTime(i * timePerSentence),
      end: this.formatSrtTime((i + 1) * timePerSentence - 0.1),
      text: text.trim(),
    }))

    const srtContent = entries
      .map((e) => `${e.index}\n${e.start} --> ${e.end}\n${e.text}\n`)
      .join('\n')

    const dir = path.join(OUTPUT_DIR, taskId, lang)
    await fs.ensureDir(dir)
    const filePath = path.join(dir, 'subtitles.srt')
    await fs.writeFile(filePath, srtContent, 'utf8')
    return filePath
  }

  private async generateDubbedAudio(taskId: string, lang: string, translatedText: string): Promise<string> {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set')

    // Pick voice ID for language
    const voiceEnvKey = `ELEVENLABS_VOICE_${lang.toUpperCase()}`
    const voiceId = process.env[voiceEnvKey] || 'pNInz6obpgDQGcFmaJgB' // fallback

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: translatedText.slice(0, 5000),
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      },
    )

    const dir = path.join(OUTPUT_DIR, taskId, lang)
    await fs.ensureDir(dir)
    const filePath = path.join(dir, 'audio.mp3')
    await fs.writeFile(filePath, Buffer.from(response.data as ArrayBuffer))
    return filePath
  }

  private formatSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.round((seconds % 1) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  private async upsertAsset(
    taskId: string,
    language: string,
    assetType: 'SUBTITLES' | 'AUDIO' | 'METADATA',
    filePath: string | null,
    contentJson?: string,
  ) {
    await prisma.localizedAsset.upsert({
      where: { taskId_language_assetType: { taskId, language, assetType } },
      update: { filePath, contentJson, status: 'DONE' },
      create: { taskId, language, assetType, filePath, contentJson, status: 'DONE' },
    })
  }
}
