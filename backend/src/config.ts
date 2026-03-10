import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  botToken: process.env.BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || 'DurakGameBot',
  appName: process.env.APP_NAME || 'durak',
  frontendUrl: process.env.FRONTEND_URL || 'https://app.games-telegram.online',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
};
