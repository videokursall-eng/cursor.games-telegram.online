import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  postgresUrl: process.env.POSTGRES_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN || 3600),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  logLevel: process.env.LOG_LEVEL || "info",
};

