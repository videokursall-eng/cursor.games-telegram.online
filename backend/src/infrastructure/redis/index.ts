import Redis from "ioredis";
import { config } from "../../config";
import { logger } from "../../shared/logger";

export let redis: Redis | null = null;

export function initRedis(): void {
  if (process.env.NODE_ENV === "test") {
    logger.info("Skipping Redis initialization in test environment");
    return;
  }

  if (!config.redisUrl) {
    logger.warn("REDIS_URL is not set; Redis will not be initialized");
    return;
  }

  redis = new Redis(config.redisUrl);

  redis.on("connect", () => logger.info("Redis connected"));
  redis.on("error", (err) => logger.error("Redis error", err));
}


