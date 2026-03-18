import { RateLimitService } from './rate-limit.service';

describe('RateLimitService (memory fallback)', () => {
  const originalStorage = process.env.RATE_LIMIT_STORAGE;

  beforeEach(() => {
    process.env.RATE_LIMIT_STORAGE = 'memory';
  });

  afterEach(async () => {
    process.env.RATE_LIMIT_STORAGE = originalStorage;
  });

  it('allows first N calls within window and blocks after limit using in-memory storage', async () => {
    const service = new RateLimitService();
    const key = 'ip:127.0.0.1:test';

    expect(await service.checkAndIncrement(key, 2, 1000)).toBe(true);
    expect(await service.checkAndIncrement(key, 2, 1000)).toBe(true);
    expect(await service.checkAndIncrement(key, 2, 1000)).toBe(false);
  });
});

