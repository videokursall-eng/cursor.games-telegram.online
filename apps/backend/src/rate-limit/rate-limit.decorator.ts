import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export type RateLimitKeyType = 'ip' | 'user';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyType?: RateLimitKeyType;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

