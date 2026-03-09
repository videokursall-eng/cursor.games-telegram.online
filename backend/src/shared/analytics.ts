import { pgPool } from "../infrastructure/db";
import { config } from "../config";
import { logger } from "./logger";

export async function logEvent(
  userId: number | null,
  eventType: string,
  payload?: unknown,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  if (!config.postgresUrl) return;

  try {
    const client = await pgPool.connect();
    try {
      await client.query(
        `
        INSERT INTO analytics_events (user_id, event_type, payload)
        VALUES ($1, $2, $3)
      `,
        [userId, eventType, payload ?? null],
      );
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn("Failed to log analytics event", eventType, err);
  }
}

