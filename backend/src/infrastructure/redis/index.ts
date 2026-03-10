import Redis from "ioredis";
import { config } from "../../config";
import { logger } from "../../shared/logger";

export let redis: Redis | null = null;

export function getRedis(): Redis | null {
  return redis;
}

export async function initRedis(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!config.redisUrl || config.redisUrl.trim() === "") {
    return;
  }

  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      client.removeListener("ready", onReady);
      client.removeListener("error", onError);
    };
    client.once("ready", onReady);
    client.once("error", onError);
  });

  client.on("error", (err) => logger.error("Redis error", err));
  redis = client;
  logger.info("Redis connected");
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info("Redis disconnected");
  }
}
