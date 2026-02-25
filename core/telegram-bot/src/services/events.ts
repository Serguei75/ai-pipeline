import Redis from 'ioredis';
import { Bot, InlineKeyboard } from 'grammy';

const STREAM_KEY = 'ai-pipeline:events';
const CONSUMER_GROUP = 'telegram-bot';
const CONSUMER_NAME = `bot-${process.pid}`;

type NotifiableEvent =
  | 'analytics.hook_weak'
  | 'localization.completed'
  | 'community.topic_exported'
  | 'topic.pending_approval'
  | 'script.pending_approval'
  | 'analytics.niche_underperforming'
  | 'hook_tester.winner_selected'
  | 'thumbnail.generated'
  | 'thumbnail.failed'
  | 'thumbnail.ab_test_created'
  | 'thumbnail.ab_test_winner'
  | 'competitor.trend_detected'
  | 'competitor.ideas_bulk_generated'
  | 'competitor.idea_exported';

interface EventEntry {
  id: string;
  type: string;
  payload: Record<string, any>;
}

export class EventConsumer {
  private redis: Redis;
  private bot: Bot;
  private running = false;
  private chatIds: Set<number> = new Set();

  constructor(bot: Bot) {
    this.bot = bot;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
    });
    const ids = (process.env.ALLOWED_CHAT_IDS || '')
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(Boolean);
    ids.forEach(id => this.chatIds.add(id));
  }

  addChatId(chatId: number) { this.chatIds.add(chatId); }

  private async ensureGroup() {
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message?.includes('BUSYGROUP')) console.warn('Consumer group:', e.message);
    }
  }

  async start() {
    try {
      await this.redis.connect();
      await this.ensureGroup();
      this.running = true;
      console.log('📡 Event consumer started — listening on', STREAM_KEY);
      this.loop();
    } catch (e) {
      console.warn('⚠️  Redis unavailable, push notifications disabled:', (e as Error).message);
    }
  }

  stop() { this.running = false; this.redis.disconnect(); }

  private parseFields(rawFields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < rawFields.length; i += 2) result[rawFields[i]] = rawFields[i + 1];
    return result;
  }

  private async loop() {
    while (this.running) {
      try {
        const results = await (this.redis as any).xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', '10', 'BLOCK', '5000',
          'STREAMS', STREAM_KEY, '>'
        ) as Array<[string, Array<[string, string[]]>]> | null;

        if (!results) continue;
        for (const [, entries] of results) {
          for (const [id, rawFields] of entries) {
            const fields = this.parseFields(rawFields);
            const entry: EventEntry = {
              id,
              type: fields.type || '',
              payload: fields.payload ? JSON.parse(fields.payload) : {},
            };
            await this.handleEvent(entry);
            await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, id);
          }
        }
      } catch (err) {
        console.error('Event loop error:', err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  private buildMessage(entry: EventEntry): { text: string; keyboard?: InlineKeyboard } | null {
    const { type, payload } = entry;

    switch (type as NotifiableEvent) {

      // ── Аналитика ────────────────────────────────────────────────────────────────
      case 'analytics.hook_weak':
        return { text:
          `⚠️ *Слабый хук!*\n\n📹 \`${payload.videoId}\`\n` +
          `📉 Retention 0–8s: *${payload.retention8s}%*\n🎣 "${payload.hook}"` };

      case 'analytics.niche_underperforming':
        return { text:
          `📉 *Ниша недозарабатывает!*\n\n🎯 *${payload.niche}*\n` +
          `💰 RPM: $${payload.actualRpm} (ожид. $${payload.expectedRpm})` };

      // ── Hook Tester ────────────────────────────────────────────────────────────
      case 'hook_tester.winner_selected':
        return { text:
          `🏆 *Победитель A/B хуков!*\n\n🎣 "${payload.winnerHook}"\n` +
          `🧠 ${payload.winnerType} · Retention: *${payload.retention8s}%*` };

      // ── Одобрения ────────────────────────────────────────────────────────────
      case 'topic.pending_approval': {
        const kb = new InlineKeyboard()
          .text('✅ Одобрить', `topic:approve:${payload.id}`)
          .text('❌ Отклонить', `topic:reject:${payload.id}`);
        return { text:
          `📌 *Тема на одобрение!*\n\n"${payload.title}"\n` +
          `🎯 ${payload.niche} · ${payload.priority} · Score: ${payload.score}`, keyboard: kb };
      }

      case 'script.pending_approval': {
        const kb = new InlineKeyboard()
          .text('✅ Одобрить', `script:approve:${payload.id}`)
          .text('❌ Отклонить', `script:reject:${payload.id}`);
        return { text:
          `📝 *Скрипт на одобрение!*\n\n"${payload.topicTitle}"\n` +
          `~${payload.estimatedDuration} мин · "${payload.hook}"`, keyboard: kb };
      }

      // ── Локализация / Комьюнити ────────────────────────────────────────
      case 'localization.completed':
        return { text:
          `✅ *Локализация готова!*\n\n🌍 *${payload.targetLanguage}* · ${payload.localizationType}\nЗадача: \`${payload.taskId}\`` };

      case 'community.topic_exported':
        return { text:
          `💬 *Новая тема из комментариев!*\n\n"${payload.question}"\n🔁 ${payload.count}×` };

      // ── 🎨 Thumbnail ────────────────────────────────────────────────────
      case 'thumbnail.ab_test_winner': {
        const ctrPct = payload.winnerCtr != null
          ? (Number(payload.winnerCtr) * 100).toFixed(2) + '%' : 'N/A';
        const hookEmoji: Record<string, string> = {
          fear: '🚨', curiosity: '🤔', surprise: '🤯', desire: '✨', social_proof: '🔥',
        };
        return { text:
          `🏆 *Победитель A/B обложек!*\n\n🎥 \`${payload.videoId}\`\n` +
          `${hookEmoji[payload.winnerHookType] ?? '🎨'} ${payload.winnerHookType} · CTR: *${ctrPct}*` };
      }

      case 'thumbnail.ab_test_created':
        return { text: `🔬 *A/B тест обложек запущен!*\n\n🎥 \`${payload.videoId}\` · ${payload.variantCount} варианта` };

      case 'thumbnail.generated':
        if (!payload.costUsd || Number(payload.costUsd) === 0) return null;
        return { text:
          `🎨 *Обложка сгенерирована*\n\n\`${payload.model}\` · $${payload.costUsd} · ${payload.durationMs}ms` };

      case 'thumbnail.failed':
        return { text:
          `❌ *Ошибка генерации обложки!*\n\n${payload.provider}\n${(payload.errorMessage ?? '').slice(0, 80)}` };

      // ── 🔍 Competitor Intelligence ──────────────────────────────────────
      case 'competitor.trend_detected': {
        // Отправляем только для видео с высоким велосититом
        const velocity = Number(payload.viewVelocity ?? 0);
        if (velocity < 5000) return null; // шум для не очень вирусных
        return { text:
          `📈 *Тренд конкурента!*\n\n` +
          `📺 ${payload.channelName}${payload.channelNiche ? ` [${payload.channelNiche}]` : ''}\n` +
          `📊 ${velocity.toLocaleString()} просм/день\n` +
          `🎥 _${payload.title}_\n\n` +
          `_Запусти AI-анализ: /competitors_` };
      }

      case 'competitor.ideas_bulk_generated':
        return { text:
          `💡 *AI сгенерировал идеи!*\n\n` +
          `📺 ${payload.channelName}\n` +
          `💡 Новых идей: *${payload.ideasCount}*\n\n` +
          `📌 /ideas — посмотреть и экспортировать` };

      case 'competitor.idea_exported':
        return { text:
          `✅ *Идея экспортирована в Topic Engine!*\n\n` +
          `📌 "${payload.title}"\n` +
          `📡 Источник: ${payload.sourceChannel}` };

      default:
        return null;
    }
  }

  private async handleEvent(entry: EventEntry) {
    const msg = this.buildMessage(entry);
    if (!msg) return;
    for (const chatId of this.chatIds) {
      try {
        await this.bot.api.sendMessage(chatId, msg.text, {
          parse_mode: 'Markdown',
          reply_markup: msg.keyboard,
        });
      } catch (e) {
        console.error(`Failed to notify chat ${chatId}:`, (e as Error).message);
      }
    }
  }
}
