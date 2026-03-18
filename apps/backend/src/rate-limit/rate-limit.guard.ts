import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import type { AuthSessionPayload } from 'shared';
import { RATE_LIMIT_KEY, type RateLimitOptions, type RateLimitKeyType } from './rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';

type RequestWithMaybeSession = Request & { session?: AuthSessionPayload };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerOpts = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    const classOpts = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getClass());
    const opts = handlerOpts ?? classOpts;
    if (!opts) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithMaybeSession>();
    const keyType: RateLimitKeyType = opts.keyType ?? 'ip';

    const keyPrefix = this.buildKeyPrefix(keyType, request);
    const routeId = `${context.getClass().name}:${context.getHandler().name}`;
    const key = `${keyPrefix}:${routeId}`;

    const allowed = await this.rateLimit.checkAndIncrement(key, opts.limit, opts.windowMs);
    if (!allowed) {
      throw new Error('Too many requests, please try again later');
    }
    return true;
  }

  private buildKeyPrefix(keyType: RateLimitKeyType, request: RequestWithMaybeSession): string {
    if (keyType === 'user' && request.session?.userId) {
      return `user:${request.session.userId}`;
    }
    const ipHeader = (request.headers['x-forwarded-for'] as string | undefined) ?? request.ip ?? 'unknown';
    return `ip:${ipHeader}`;
  }
}

