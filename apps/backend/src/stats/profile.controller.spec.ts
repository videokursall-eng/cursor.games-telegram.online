import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ProfileController', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: StatsService,
          useValue: {
            getProfileWithStats: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('returns profile + stats + achievements for authenticated user', async () => {
    const payload = {
      profile: { userId: 'u1', displayName: 'Test', joinedAt: '2024-01-01T00:00:00.000Z' },
      stats: { matchesPlayed: 5, wins: 3, losses: 2, draws: 0, winRate: 0.6, currentWinStreak: 1, bestWinStreak: 2, averageMatchDurationMs: 120000, totalMatchDurationMs: 600000, favoriteMode: 'podkidnoy' as const },
      achievements: [{ code: 'first_match', unlockedAt: '2024-01-01T00:00:00.000Z', currentValue: 1, targetValue: 1 }],
      season: {
        userId: 'u1',
        seasonId: 's1',
        level: 3,
        currentXp: 250,
        xpToNextLevel: 50,
        claimedRewardIds: [],
        updatedAt: '2024-01-10T00:00:00.000Z',
      },
    };
    jest.spyOn(controller['statsService'], 'getProfileWithStats').mockResolvedValue(payload);
    const result = await controller.getProfile({ userId: 'u1', telegramId: 1 });
    expect(result).toEqual(payload);
    expect(result.profile.userId).toBe('u1');
    expect(result.stats.matchesPlayed).toBe(5);
    expect(result.achievements).toHaveLength(1);
    expect(result.season?.level).toBe(3);
  });

  it('throws NotFoundException when profile not found', async () => {
    jest.spyOn(controller['statsService'], 'getProfileWithStats').mockResolvedValue(null);
    await expect(controller.getProfile({ userId: 'unknown', telegramId: 0 })).rejects.toThrow(NotFoundException);
  });
});
