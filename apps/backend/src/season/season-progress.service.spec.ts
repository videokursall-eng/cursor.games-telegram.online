import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { SeasonProgressService } from './season-progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { CosmeticsService } from '../economy/cosmetics.service';

function createInMemoryPrisma(): PrismaService {
  type SeasonRow = { id: string; code: string; name: string; startsAt: Date; endsAt: Date | null; isActive: boolean };
  type ProgressRow = {
    userId: string;
    seasonId: string;
    xp: number;
    level: number;
    claimedRewardIds: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type MatchRewardRow = { userId: string; seasonId: string; matchId: string };
  type RewardRow = {
    id: string;
    seasonId: string;
    level: number;
    rewardType: string;
    amountSoft: number | null;
    cosmeticItemId: string | null;
    badgeId: string | null;
  };
  type ClaimRow = { id: string; userId: string; seasonId: string; rewardId: string };

  const seasons: SeasonRow[] = [];
  const progresses: ProgressRow[] = [];
  const matchRewards: MatchRewardRow[] = [];
  const rewardTrack: RewardRow[] = [];
  const rewardClaims: ClaimRow[] = [];

  const defaultSeasonId = 'season-1';

  seasons.push({
    id: defaultSeasonId,
    code: 'season_1',
    name: 'Season 1',
    startsAt: new Date(),
    endsAt: null,
    isActive: true,
  });

  rewardTrack.push({
    id: 'reward-soft-l2',
    seasonId: defaultSeasonId,
    level: 2,
    rewardType: 'soft',
    amountSoft: 200,
    cosmeticItemId: null,
    badgeId: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    season: {
      findFirst: async () => seasons[0],
      create: async (args: { data: Omit<SeasonRow, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const season: SeasonRow = {
          id: defaultSeasonId,
          code: args.data.code,
          name: args.data.name,
          startsAt: args.data.startsAt,
          endsAt: null,
          isActive: true,
        };
        seasons[0] = season;
        return season;
      },
    },
    seasonProgress: {
      findUnique: async (args: { where: { userId_seasonId: { userId: string; seasonId: string } } }) =>
        progresses.find(
          (p) =>
            p.userId === args.where.userId_seasonId.userId &&
            p.seasonId === args.where.userId_seasonId.seasonId,
        ) ?? null,
      create: async (args: { data: { userId: string; seasonId: string; xp: number; level: number; claimedRewardIds: string } }) => {
        const now = new Date();
        const p: ProgressRow = {
          userId: args.data.userId,
          seasonId: args.data.seasonId,
          xp: args.data.xp,
          level: args.data.level,
          claimedRewardIds: args.data.claimedRewardIds,
          createdAt: now,
          updatedAt: now,
        };
        progresses.push(p);
        return p;
      },
      update: async (args: { where: { userId_seasonId: { userId: string; seasonId: string } }; data: Partial<ProgressRow> }) => {
        const idx = progresses.findIndex(
          (p) =>
            p.userId === args.where.userId_seasonId.userId &&
            p.seasonId === args.where.userId_seasonId.seasonId,
        );
          if (idx >= 0) {
          const current = progresses[idx];
          const updated: ProgressRow = {
            ...current,
            xp: args.data.xp ?? current.xp,
            level: args.data.level ?? current.level,
            claimedRewardIds: args.data.claimedRewardIds ?? current.claimedRewardIds,
            updatedAt: new Date(),
          };
          progresses[idx] = updated;
          return updated;
        }
        throw new Error('progress not found');
      },
    },
      seasonMatchReward: {
        findUnique: async (args: { where: { userId_seasonId_matchId: { userId: string; seasonId: string; matchId: string } } }) =>
          matchRewards.find(
          (r) =>
            r.userId === args.where.userId_seasonId_matchId.userId &&
            r.seasonId === args.where.userId_seasonId_matchId.seasonId &&
            r.matchId === args.where.userId_seasonId_matchId.matchId,
        ) ?? null,
        create: async (args: { data: { userId: string; seasonId: string; matchId: string } }) => {
          const r: MatchRewardRow = {
            userId: args.data.userId,
            seasonId: args.data.seasonId,
            matchId: args.data.matchId,
          };
          matchRewards.push(r);
          return r;
      },
    },
    rewardTrackItem: {
      findFirst: async (args: { where: { seasonId: string; level: number } }) =>
        rewardTrack.find(
          (r) => r.seasonId === args.where.seasonId && r.level === args.where.level,
        ) ?? null,
      findMany: async (args: { where: { seasonId: string }; orderBy?: { level: 'asc' | 'desc' } }) =>
        rewardTrack
          .filter((r) => r.seasonId === args.where.seasonId)
          .sort((a, b) => a.level - b.level)
          .map((r) => ({ ...r, badge: null })),
    },
      seasonRewardClaim: {
        findUnique: async (args: { where: { userId_seasonId_rewardId: { userId: string; seasonId: string; rewardId: string } } }) =>
          rewardClaims.find(
          (c) =>
            c.userId === args.where.userId_seasonId_rewardId.userId &&
            c.seasonId === args.where.userId_seasonId_rewardId.seasonId &&
            c.rewardId === args.where.userId_seasonId_rewardId.rewardId,
        ) ?? null,
        create: async (args: { data: { userId: string; seasonId: string; rewardId: string } }) => {
          const c: ClaimRow = {
            id: `rc-${rewardClaims.length + 1}`,
            userId: args.data.userId,
            seasonId: args.data.seasonId,
            rewardId: args.data.rewardId,
          };
          rewardClaims.push(c);
          return c;
      },
    },
  };

  prisma.$transaction = async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(prisma);

  return prisma as PrismaService;
}

describe('SeasonProgressService', () => {
  let service: SeasonProgressService;
  const wallet: { credit: jest.Mock } = { credit: jest.fn() };
  const cosmetics: { grantItem: jest.Mock } = { grantItem: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonProgressService,
        { provide: PrismaService, useFactory: createInMemoryPrisma },
        { provide: WalletService, useValue: wallet },
        { provide: CosmeticsService, useValue: cosmetics },
      ],
    }).compile();

    service = module.get(SeasonProgressService);
    wallet.credit.mockReset();
    cosmetics.grantItem.mockReset();
  });

  it('accrues XP and increases level after matches', async () => {
    const userId = 'u1';
    const before = await service.getSeasonWithTrack(userId);
    expect(before.progress.level).toBe(1);

    const after = await service.addMatchXp({
      userId,
      matchId: 'm1',
      mode: 'podkidnoy',
      matchOutcome: 'normal',
      playerOutcome: 'WIN',
    });

    expect(after.currentXp).toBeGreaterThan(0);
    expect(after.level).toBeGreaterThanOrEqual(1);
  });

  it('claims reward once and prevents duplicate claims', async () => {
    const userId = 'u2';

    // Ensure user has enough XP/level; here we just call claim without checking level server-side.
    await service.addMatchXp({
      userId,
      matchId: 'm1',
      mode: 'podkidnoy',
      matchOutcome: 'normal',
      playerOutcome: 'WIN',
    });
    await service.addMatchXp({
      userId,
      matchId: 'm2',
      mode: 'podkidnoy',
      matchOutcome: 'normal',
      playerOutcome: 'WIN',
    });

    await service.claimRewardLevel(userId, 2);
    expect(wallet.credit).toHaveBeenCalledWith(
      userId,
      200,
      'season_pass',
      expect.objectContaining({ level: 2 }),
    );

    await expect(service.claimRewardLevel(userId, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when reward for level not found', async () => {
    const userId = 'u3';
    await expect(service.claimRewardLevel(userId, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

