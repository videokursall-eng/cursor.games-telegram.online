import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('StatsController', () => {
  let controller: StatsController;
  let statsService: StatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: {
            getAggregatedStats: jest.fn().mockResolvedValue({
              matchesPlayed: 3,
              wins: 2,
              losses: 1,
              draws: 0,
              winRate: 2 / 3,
              currentWinStreak: 1,
              bestWinStreak: 2,
              averageMatchDurationMs: 100_000,
              totalMatchDurationMs: 300_000,
              favoriteMode: 'podkidnoy',
              perModeTotals: {
                podkidnoy: { matchesPlayed: 2, wins: 2, losses: 0, draws: 0 },
                perevodnoy: { matchesPlayed: 1, wins: 0, losses: 1, draws: 0 },
              },
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StatsController>(StatsController);
    statsService = module.get<StatsService>(StatsService);
  });

  it('returns aggregated stats for current user', async () => {
    const result = await controller.getMyStats({ userId: 'u1', telegramId: 1 } as { userId: string; telegramId: number });
    expect(statsService.getAggregatedStats).toHaveBeenCalledWith('u1');
    expect(result.matchesPlayed).toBe(3);
    expect(result.perModeTotals?.podkidnoy.matchesPlayed).toBe(2);
  });

  it('returns aggregated stats for arbitrary user', async () => {
    const result = await controller.getPlayerStats('u2');
    expect(statsService.getAggregatedStats).toHaveBeenCalledWith('u2');
    expect(result.bestWinStreak).toBe(2);
  });
});

