import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminStatsController } from './admin-stats.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;

  const prismaMock = {
    match: {
      count: jest.fn().mockResolvedValue(10),
      groupBy: jest.fn().mockResolvedValue([
        { mode: 'PODKIDNOY', _count: { _all: 6 } },
        { mode: 'PEREVODNOY', _count: { _all: 4 } },
      ]),
    },
    playerMatchRecord: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1', _count: { _all: 3 } }]),
    },
    transaction: {
      count: jest.fn().mockResolvedValue(5),
    },
    playerCosmeticItem: {
      groupBy: jest.fn().mockResolvedValue([
        { itemId: 'avatar_hat_red', _count: { _all: 3 } },
        { itemId: 'frame_gold', _count: { _all: 2 } },
      ]),
    },
    session: {
      groupBy: jest.fn().mockResolvedValue([
        { userId: 'u1', _count: { _all: 2 } },
        { userId: 'u2', _count: { _all: 1 } },
      ]),
    },
    user: {
      count: jest.fn().mockResolvedValue(7),
    },
    seasonRewardClaim: {
      groupBy: jest.fn().mockResolvedValue([
        { seasonId: 'season-1', _count: { _all: 4 } },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminStatsController);
  });

  it('returns aggregated overview stats', async () => {
    const result = await controller.getOverview();
    expect(result.matchesTotal).toBe(10);
    expect(result.matchesByMode).toEqual([
      { mode: 'PODKIDNOY', count: 6 },
      { mode: 'PEREVODNOY', count: 4 },
    ]);
    expect(result.dau).toBe(1);
    expect(result.mau).toBe(1);
    expect(result.purchasesTotal).toBe(5);
    expect(result.topCosmetics[0].itemId).toBe('avatar_hat_red');
    expect(result.activePlayers).toBe(2);
    expect(result.newPlayersLast7d).toBe(7);
    expect(result.seasonClaims[0]).toEqual({ seasonId: 'season-1', claims: 4 });
  });
});

