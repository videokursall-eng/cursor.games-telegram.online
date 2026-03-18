import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function createContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();
  const envBackup = process.env.ADMIN_TELEGRAM_IDS;

  afterEach(() => {
    process.env.ADMIN_TELEGRAM_IDS = envBackup;
  });

  it('denies access when no user or no config', () => {
    process.env.ADMIN_TELEGRAM_IDS = '123';
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
    delete process.env.ADMIN_TELEGRAM_IDS;
    expect(() => guard.canActivate(createContext({ telegramId: 123 }))).toThrow(ForbiddenException);
  });

  it('allows access when telegramId is in ADMIN_TELEGRAM_IDS', () => {
    process.env.ADMIN_TELEGRAM_IDS = '123, 456';
    const result = guard.canActivate(createContext({ telegramId: 123 }));
    expect(result).toBe(true);
  });

  it('denies access when telegramId is not in ADMIN_TELEGRAM_IDS', () => {
    process.env.ADMIN_TELEGRAM_IDS = '789';
    expect(() => guard.canActivate(createContext({ telegramId: 123 }))).toThrow(ForbiddenException);
  });
});

