import { Context } from 'grammy';
import axios from 'axios';

const VIDEO_ENGINE_URL = process.env.VIDEO_ENGINE_URL || 'http://video-engine:3011';

interface VideoJob {
  jobId: string;
  providerJobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  costUsd?: number;
  estimatedTime?: number;
}

export async function handleVideoCommand(ctx: Context) {
  const args = (ctx as any).msg?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    return (ctx as any).reply(
      '🎬 *Генерация видео через Veo 3*\n\n' +
      '*Использование:*\n' +
      '`/video <промпт>`\n\n' +
      '*Примеры:*\n' +
      '• `/video AI робот создаёт контент`\n' +
      '• `/video Футуристическая лаборатория`\n' +
      '• `/video Космический корабль в полёте`\n\n' +
      '*Параметры по умолчанию:*\n' +
      '• Длительность: 10 секунд\n' +
      '• Соотношение: 16:9\n' +
      '• Разрешение: 1080p\n' +
      '• Модель: veo-3 (или mock для теста)',
      { parse_mode: 'Markdown' }
    );
  }

  const prompt = args.join(' ');
  
  await (ctx as any).reply('⏳ Запускаю генерацию видео...');

  try {
    const response = await axios.post(`${VIDEO_ENGINE_URL}/api/videos/generate`, {
      prompt,
      model: process.env.KIEAI_API_KEY ? 'veo-3' : 'mock',
      duration: 10,
      aspectRatio: '16:9',
      resolution: '1080p',
      userId: (ctx as any).from?.id.toString(),
    });

    const job: VideoJob = response.data;

    console.log({ jobId: job.jobId, prompt }, 'Video generation started');

    const statusMessage = await (ctx as any).reply(
      `🎬 *Видео генерируется...*\n\n` +
      `📝 Промпт: _${prompt}_\n` +
      `🆔 Job ID: \`${job.jobId}\`\n` +
      `⏱️ Примерное время: ~${job.estimatedTime || 60}с\n` +
      `📊 Статус: \`${job.status}\`\n\n` +
      `⏳ [░░░░░░░░░░] 0%`,
      { parse_mode: 'Markdown' }
    );

    await pollVideoStatus(ctx, job.jobId, statusMessage.message_id, prompt);

  } catch (error: any) {
    console.error({ error: error.message }, 'Video generation failed');
    await (ctx as any).reply(
      '❌ *Ошибка генерации видео*\n\n' +
      `Причина: ${error.response?.data?.error || error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function pollVideoStatus(
  ctx: Context,
  jobId: string,
  messageId: number,
  prompt: string
) {
  let attempts = 0;
  const maxAttempts = 40;

  const interval = setInterval(async () => {
    attempts++;

    try {
      const response = await axios.get(`${VIDEO_ENGINE_URL}/api/videos/status/${jobId}`);
      const job: VideoJob = response.data;

      const progress = Math.min(
        Math.floor((attempts / maxAttempts) * 100),
        job.status === 'completed' ? 100 : 95
      );

      const progressBar = createProgressBar(progress);

      try {
        await (ctx as any).api.editMessageText(
          (ctx as any).chat!.id,
          messageId,
          undefined,
          `🎬 *Видео генерируется...*\n\n` +
          `📝 Промпт: _${prompt}_\n` +
          `🆔 Job ID: \`${jobId}\`\n` +
          `📊 Статус: \`${job.status}\`\n\n` +
          `⏳ ${progressBar} ${progress}%`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        // Message edit failed, continue polling
      }

      if (job.status === 'completed') {
        clearInterval(interval);

        try {
          await (ctx as any).api.editMessageText(
            (ctx as any).chat!.id,
            messageId,
            undefined,
            `✅ *Видео готово!*\n\n` +
            `📝 Промпт: _${prompt}_\n` +
            `⏱️ Длительность: ${job.duration}с\n` +
            `💰 Стоимость: $${job.costUsd?.toFixed(2) || '0.00'}\n\n` +
            `⏳ [██████████] 100%`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          await (ctx as any).reply(
            `✅ *Видео готово!*\n\n` +
            `⏱️ Длительность: ${job.duration}с\n` +
            `💰 Стоимость: $${job.costUsd?.toFixed(2) || '0.00'}`,
            { parse_mode: 'Markdown' }
          );
        }

        if (job.videoUrl) {
          try {
            await (ctx as any).replyWithVideo(job.videoUrl, {
              caption: `🎬 ${prompt}`,
            });
          } catch (e: any) {
            await (ctx as any).reply(`📹 Видео: ${job.videoUrl}`);
          }
        }

        console.log({ jobId, videoUrl: job.videoUrl }, 'Video sent to user');
      }

      if (job.status === 'failed') {
        clearInterval(interval);

        await (ctx as any).reply(
          `❌ *Генерация не удалась*\n\n` +
          `📝 Промпт: _${prompt}_\n` +
          `🆔 Job ID: \`${jobId}\``,
          { parse_mode: 'Markdown' }
        );
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        await (ctx as any).reply('⏱️ Превышено время ожидания.');
      }

    } catch (error: any) {
      console.error({ error: error.message, jobId }, 'Polling error');
    }
  }, 5000);
}

function createProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}
