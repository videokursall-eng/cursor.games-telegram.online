import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('RateLimitGuard', () => {
  function createContextMock(methodName: string, handlerOpts?: RateLimitOptions): {
    guard: RateLimitGuard;
    ctx: ExecutionContext;
  } {
    const rateLimit = new RateLimitService();
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
      if (key === RATE_LIMIT_KEY) {
        return handlerOpts;
      }
      return undefined;
    });

    const guard = new RateLimitGuard(reflector, rateLimit);
    const req = {
      ip: '127.0.0.1',
      headers: {},
      session: { userId: 'u1' },
    };
    const ctx: ExecutionContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      switchToHttp: () => ({ getRequest: () => req } as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getClass: () => ({ name: 'TestController' } as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getHandler: () => ({ name: methodName } as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getArgByIndex: () => undefined as any,
      getArgs: () => [],
      getType: () => 'http',
    } as unknown as ExecutionContext;

    return { guard, ctx };
  }

  it('allows requests under limit and blocks when exceeded', async () => {
    const options: RateLimitOptions = { limit: 1, windowMs: 10_000, keyType: 'ip' };
    const { guard, ctx } = createContextMock('testMethod', options);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toThrowError();
  });
});

