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
  | 'hook_tester.winner_selected';

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

    // Load allowed chat IDs from env
    const ids = (process.env.ALLOWED_CHAT_IDS || '').split(',').map(s => parseInt(s.trim())).filter(Boolean);
    ids.forEach(id => this.chatIds.add(id));
  }

  addChatId(chatId: number) {
    this.chatIds.add(chatId);
  }

  private async ensureGroup() {
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message?.includes('BUSYGROUP')) {
        console.warn('Could not create consumer group (Redis may be unavailable):', e.message);
      }
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

  stop() {
    this.running = false;
    this.redis.disconnect();
  }

  private parseFields(rawFields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < rawFields.length; i += 2) {
      result[rawFields[i]] = rawFields[i + 1];
    }
    return result;
  }

  private async loop() {
    while (this.running) {
      try {
        const results = await (this.redis as any).xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', '10',
          'BLOCK', '5000',
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
        console.error('Event consumer loop error:', err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  private buildMessage(entry: EventEntry): { text: string; keyboard?: InlineKeyboard } | null {
    const { type, payload } = entry;

    switch (type as NotifiableEvent) {
      case 'analytics.hook_weak':
        return {
          text:
            `⚠️ *Слабый хук обнаружен!*\n\n` +
            `📹 Видео ID: \`${payload.videoId ?? 'N/A'}\`\n` +
            `📉 Retention 0–8s: *${payload.retention8s ?? 0}%* (норма > 40%)\n` +
            `🎣 Хук: "${payload.hook ?? 'N/A'}"\n\n` +
            `_Скрипт помечен для доработки_`,
        };

      case 'analytics.niche_underperforming':
        return {
          text:
            `📉 *Ниша недозарабатывает!*\n\n` +
            `🎯 Ниша: *${payload.niche ?? 'N/A'}*\n` +
            `💰 Ожидаемый RPM: $${payload.expectedRpm ?? 0}\n` +
            `💰 Фактический RPM: $${payload.actualRpm ?? 0}\n\n` +
            `_Topic Engine скорректирует приоритет ниши_`,
        };

      case 'hook_tester.winner_selected':
        return {
          text:
            `🏆 *Победитель A/B теста определён!*\n\n` +
            `🎣 Хук: "${payload.winnerHook ?? 'N/A'}"\n` +
            `🧠 Тип: *${payload.winnerType ?? 'N/A'}*\n` +
            `📈 Retention: *${payload.retention8s ?? 0}%*\n\n` +
            `_Добавлен в Template Library_`,
        };

      case 'localization.completed':
        return {
          text:
            `✅ *Локализация готова!*\n\n` +
            `🌍 Язык: *${payload.targetLanguage ?? 'N/A'}*\n` +
            `📦 Тип: ${payload.localizationType ?? 'N/A'}\n` +
            `🆔 Задача: \`${payload.taskId ?? 'N/A'}\``,
        };

      case 'community.topic_exported':
        return {
          text:
            `💬 *Новая тема из комментариев!*\n\n` +
            `❓ "${payload.question ?? 'N/A'}"\n` +
            `🔁 Частота: *${payload.count ?? 1}×*\n\n` +
            `_Добавлена в Topic Engine для генерации_`,
        };

      case 'topic.pending_approval': {
        const kb = new InlineKeyboard()
          .text('✅ Одобрить', `topic:approve:${payload.id}`)
          .text('❌ Отклонить', `topic:reject:${payload.id}`);
        return {
          text:
            `📌 *Новая тема ждёт одобрения!*\n\n` +
            `📝 "${payload.title ?? 'N/A'}"\n` +
            `🎯 Ниша: ${payload.niche ?? 'N/A'}\n` +
            `⭐ Приоритет: ${payload.priority ?? 'MEDIUM'}\n` +
            `📊 Score: ${payload.score ?? 0}`,
          keyboard: kb,
        };
      }

      case 'script.pending_approval': {
        const kb = new InlineKeyboard()
          .text('✅ Одобрить', `script:approve:${payload.id}`)
          .text('❌ Отклонить', `script:reject:${payload.id}`);
        return {
          text:
            `📝 *Скрипт ждёт одобрения!*\n\n` +
            `🎬 Тема: "${payload.topicTitle ?? 'N/A'}"\n` +
            `⏱ Длительность: ~${payload.estimatedDuration ?? 'N/A'} мин\n` +
            `🎣 Хук: "${payload.hook ?? 'N/A'}"`,
          keyboard: kb,
        };
      }

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
