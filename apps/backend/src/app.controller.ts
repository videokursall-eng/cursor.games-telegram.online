import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RateLimitService } from './rate-limit/rate-limit.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{
    status: 'ok' | 'error';
    db: 'ok' | 'error';
    redis: { mode: 'memory' | 'redis'; status: 'ok' | 'down' };
  }> {
    const dbOk = await this.checkDb();
    const redis = await this.rateLimit.health();
    const status: 'ok' | 'error' = dbOk && redis.status === 'ok' ? 'ok' : 'error';
    return {
      status,
      db: dbOk ? 'ok' : 'error',
      redis,
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      // Lightweight connectivity probe.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any).$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
