import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { RateLimitService } from './rate-limit/rate-limit.service';

describe('AppController', () => {
  let controller: AppController;
  let prisma: PrismaService;
  let rateLimit: RateLimitService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValueOnce([{ '?column?': 1 }]),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            health: jest.fn().mockResolvedValue({ mode: 'memory', status: 'ok' }),
          },
        },
      ],
    }).compile();

    controller = app.get<AppController>(AppController);
    prisma = app.get(PrismaService);
    rateLimit = app.get(RateLimitService);
  });

  describe('health', () => {
    it('returns status ok', () => {
      expect(controller.health()).toEqual({ status: 'ok' });
    });
  });

  describe('ready', () => {
    it('returns ok status when db and redis are healthy', async () => {
      const res = await controller.ready();
      expect(res.status).toBe('ok');
      expect(res.db).toBe('ok');
      expect(res.redis).toEqual({ mode: 'memory', status: 'ok' });
      expect((prisma.$queryRaw as jest.Mock).mock.calls.length).toBe(1);
      expect((rateLimit.health as jest.Mock).mock.calls.length).toBe(1);
    });
  });
});
