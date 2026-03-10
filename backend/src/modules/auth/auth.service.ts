import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { pgPool } from "../../infrastructure/db";
import { AppError } from "../../shared/errors";
import { logger } from "../../shared/logger";
import { logEvent } from "../../shared/analytics";
import { AuthResponse, TelegramInitDataPayload } from "./auth.types";

function parseInitData(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(raw);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function validateTelegramInitData(raw: string, botToken: string): TelegramInitDataPayload {
  const data = parseInitData(raw);
  const hash = data.hash;
  if (!hash) {
    throw new AppError("Missing hash", 400, "INVALID_INIT_DATA");
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete data.hash;
  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    throw new AppError("Invalid hash", 400, "INVALID_INIT_DATA");
  }

  const authDate = Number(data.auth_date || 0);
  const now = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = 86400; // 24 hours — Telegram initData is valid for up to 24h in production
  if (!authDate || now - authDate > maxAgeSeconds) {
    throw new AppError("Auth data is too old", 401, "INIT_DATA_EXPIRED");
  }

  const payload = JSON.parse(data.user || "{}") as TelegramInitDataPayload["user"];

  return {
    user: payload,
    auth_date: data.auth_date,
    hash,
  };
}

export async function validateTelegramAndIssueJwt(initData: string): Promise<AuthResponse> {
  if (!config.telegramBotToken) {
    throw new AppError("Telegram bot token not configured", 500, "TELEGRAM_CONFIG_MISSING");
  }
  if (!config.postgresUrl) {
    throw new AppError("Database not configured", 503, "SERVICE_UNAVAILABLE");
  }

  let payload: TelegramInitDataPayload;
  try {
    payload = validateTelegramInitData(initData, config.telegramBotToken);
  } catch (err) {
    logger.warn("Auth initData validation failed", err);
    throw err;
  }
  if (!payload.user) {
    throw new AppError("Missing user", 400, "INVALID_INIT_DATA");
  }

  let client;
  try {
    client = await pgPool.connect();
  } catch (err) {
    logger.error("Database connection failed during auth", err);
    throw new AppError("Database unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const result = await client.query(
      `
        INSERT INTO users (tg_id, username)
        VALUES ($1, $2)
        ON CONFLICT (tg_id) DO UPDATE
        SET username = EXCLUDED.username
        RETURNING id, username
      `,
      [payload.user.id, payload.user.username || null],
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError("User upsert failed", 500, "INTERNAL_ERROR");
    }

    const activeMatchRes = await client.query(
      "SELECT id FROM matches WHERE status = 'in_progress' AND EXISTS (SELECT 1 FROM match_players mp WHERE mp.match_id = matches.id AND mp.user_id = $1) ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );

    const activeMatchId = activeMatchRes.rows[0]?.id ?? null;

    const token = jwt.sign(
      {
        sub: user.id,
        tgId: payload.user.id,
        username: user.username,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    logger.info("Auth success", {
      userId: user.id,
      tgId: payload.user.id,
      username: user.username,
      activeMatchId,
    });

    void logEvent(user.id, "auth_success", {
      tgId: payload.user.id,
    });

    return {
      jwt: token,
      user: {
        id: user.id,
        username: user.username || undefined,
        firstName: payload.user.first_name,
        lastName: payload.user.last_name,
      },
      activeMatchId,
    };
  } finally {
    client.release();
  }
}

