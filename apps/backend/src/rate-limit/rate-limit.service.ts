import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redisClient: RedisClientType | null = null;
  private readonly memoryBuckets = new Map<string, { count: number; resetAt: number }>();

  private get useRedis(): boolean {
    return process.env.RATE_LIMIT_STORAGE === 'redis';
  }

  private async ensureRedis(): Promise<RedisClientType | null> {
    if (!this.useRedis) {
      return null;
    }
    if (this.redisClient) {
      return this.redisClient;
    }
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('RATE_LIMIT_STORAGE=redis but REDIS_URL is not set, falling back to in-memory rate limit');
      return null;
    }
    try {
      const client: RedisClientType = createClient({ url });
      await client.connect();
      this.redisClient = client;
      return client;
    } catch (err) {
      this.logger.error('Failed to connect Redis for rate limiting, falling back to in-memory', err as Error);
      this.redisClient = null;
      return null;
    }
  }

  /**
   * Distributed-safe fixed window limiter.
   * Returns true if request is allowed, false if limit exceeded.
   */
  async checkAndIncrement(key: string, limit: number, windowMs: number): Promise<boolean> {
    const client = await this.ensureRedis();
    if (client) {
      try {
        const script = `
          local current = redis.call("INCR", KEYS[1])
          if current == 1 then
            redis.call("PEXPIRE", KEYS[1], ARGV[1])
          end
          return current
        `;
        const current = (await client.eval(script, {
          keys: [key],
          arguments: [String(windowMs)],
        })) as number;
        return current <= limit;
      } catch (err) {
        this.logger.error('Redis rate limit error, falling back to in-memory', err as Error);
      }
    }

    const now = Date.now();
    const existing = this.memoryBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= limit) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  // For tests
  async clearAll(): Promise<void> {
    this.memoryBuckets.clear();
    if (this.redisClient) {
      await this.redisClient.flushDb();
    }
  }

  /**
   * Lightweight health check for readiness probes.
   * - When RATE_LIMIT_STORAGE !== 'redis' => reports in-memory mode as ok.
   * - When redis mode is enabled:
   *   - returns status "ok" if PING succeeds;
   *   - returns status "down" if redis is not reachable.
   */
  async health(): Promise<{ mode: 'memory' | 'redis'; status: 'ok' | 'down' }> {
    if (!this.useRedis) {
      return { mode: 'memory', status: 'ok' };
    }
    const client = await this.ensureRedis();
    if (!client) {
      return { mode: 'redis', status: 'down' };
    }
    try {
      await client.ping();
      return { mode: 'redis', status: 'ok' };
    } catch (err) {
      this.logger.error('Redis health check failed', err as Error);
      return { mode: 'redis', status: 'down' };
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (err) {
        this.logger.error('Error while closing Redis client during shutdown', err as Error);
      } finally {
        this.redisClient = null;
      }
    }
  }
}

