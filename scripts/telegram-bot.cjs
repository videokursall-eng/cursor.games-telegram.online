#!/usr/bin/env node
/**
 * Telegram bot: при /start отправляет кнопку "Играть" с Web App (Mini App).
 * Запуск: TELEGRAM_BOT_TOKEN=... [MINI_APP_URL=https://...] node scripts/telegram-bot.cjs
 *
 * Важно: кнопка должна быть именно web_app, чтобы Telegram передавал initData в Mini App.
 */
const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL || 'https://app.games-telegram.online';

if (!token) {
  console.error('Укажите TELEGRAM_BOT_TOKEN в окружении.');
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  ctx.reply('🎮 Играть в Дурака:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Играть',
            web_app: {
              url: miniAppUrl,
            },
          },
        ],
      ],
    },
  });
});

bot.launch().then(() => {
  console.log('Telegram bot запущен. Mini App URL:', miniAppUrl);
}).catch((err) => {
  console.error('Ошибка запуска бота:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
