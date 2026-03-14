import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminSeasonController } from './admin-season.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

describe('AdminSeasonController', () => {
  let controller: AdminSeasonController;
  const seasons: Array<{
    id: string;
    code: string;
    title?: string;
    name?: string;
    isActive?: boolean;
    startsAt?: Date;
    endsAt?: Date | null;
  }> = [];
  const rewards: Array<{ id: string; seasonId: string; level: number; badgeId?: string | null }> = [];

  const prismaMock: {
    season: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    rewardTrackItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    cosmeticCatalogItem: {
      findUnique: jest.Mock;
    };
    badge: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    season: {
      findMany: jest.fn(async () => seasons),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        (seasons as Array<{ id: string }>).find((s) => s.id === where.id) ?? null,
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: jest.fn(async ({ data }: { data: any }) => {
        const row = {
          id: data.id ?? `season_${seasons.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        (seasons as unknown[]).push(row);
        return row;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const idx = (seasons as Array<{ id: string }>).findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error('not found');
        const next = { ...(seasons as any)[idx], ...data, updatedAt: new Date() };
        (seasons as any)[idx] = next;
        return next;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateMany: jest.fn(async ({ data }: { data: any }) => {
        (seasons as any[]).forEach((s, i) => {
          (seasons as any[])[i] = { ...s, ...data, updatedAt: new Date() };
        });
        return { count: (seasons as any[]).length };
      }),
    },
    rewardTrackItem: {
      findMany: jest.fn(async ({ where }: { where: { seasonId: string } }) =>
        (rewards as Array<{ seasonId: string }>).filter((r) => r.seasonId === where.seasonId),
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { seasonId: string; level: number; NOT?: { id: string } };
        }) =>
          (rewards as Array<{ seasonId: string; level: number; id: string }>).find(
          (r) =>
            r.seasonId === where.seasonId &&
            r.level === where.level &&
            (!where.NOT || r.id !== where.NOT.id),
          ) ?? null,
      ),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        (rewards as Array<{ id: string }>).find((r) => r.id === where.id) ?? null,
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: jest.fn(async ({ data }: { data: any }) => {
        const row = {
          id: data.id ?? `reward_${rewards.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        (rewards as unknown[]).push(row);
        return row;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const idx = (rewards as Array<{ id: string }>).findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error('not found');
        const next = { ...(rewards as any)[idx], ...data, updatedAt: new Date() };
        (rewards as any)[idx] = next;
        return next;
      }),
      deleteMany: jest.fn(async ({ where }: { where: { id: string; seasonId: string } }) => {
        const list = rewards as Array<{ id: string; seasonId: string }>;
        const before = list.length;
        for (let i = list.length - 1; i >= 0; i -= 1) {
          if (list[i].id === where.id && list[i].seasonId === where.seasonId) {
            list.splice(i, 1);
          }
        }
        return { count: before - list.length };
      }),
    },
    cosmeticCatalogItem: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === 'avatar_hat_red' ? { id: 'avatar_hat_red' } : null,
      ),
    },
    badge: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === 'badge_1'
          ? {
              id: 'badge_1',
              code: 'first_win',
              title: 'Первая победа',
              description: 'Бейдж за первую победу',
              icon: null,
              rarity: 'common',
              createdAt: new Date(),
            }
          : null,
      ),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>): Promise<any> =>
      fn({
        season: {
          updateMany: prismaMock.season.updateMany,
          update: prismaMock.season.update,
          create: prismaMock.season.create,
        },
      }),
    ),
  };

  beforeEach(async () => {
    seasons.length = 0;
    rewards.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSeasonController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AdminAuditService,
          useValue: { log: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminSeasonController);
  });

  it('returns mapped seasons', async () => {
    seasons.push({
      id: 's1',
      code: 'season_1',
      title: 'Season 1',
      startsAt: new Date(),
      endsAt: new Date(),
    });
    const result = await controller.list();
    expect(result).toEqual([{ id: 's1', code: 'season_1', title: 'Season 1' }]);
  });

  it('creates season and can set it active while deactivating others', async () => {
    const session: any = { userId: 'admin1' };
    await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });
    await controller.createSeason(session, {
      code: 'season_2',
      name: 'Season 2',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });

    const activeSeasons = seasons.filter((s) => s.isActive);
    expect(activeSeasons).toHaveLength(1);
    expect(activeSeasons[0].code).toBe('season_2');
  });

  it('updates season and switches active flag correctly', async () => {
    const session: any = { userId: 'admin1' };
    const created = await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });
    await controller.updateSeason(session, created.id, { isActive: false });
    const after = seasons.find((s) => s.id === created.id);
    expect(after?.isActive).toBe(false);
  });

  it('creates reward track item for a season', async () => {
    const session: any = { userId: 'admin1' };
    const season = await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });

    const reward = await controller.createReward(session, season.id, {
      level: 1,
      rewardType: 'soft',
      amountSoft: 100,
    });

    expect(reward.level).toBe(1);
    expect(reward.rewardType).toBe('soft');
    expect(reward.amountSoft).toBe(100);
  });

  it('rejects duplicate reward level in the same season', async () => {
    const session: any = { userId: 'admin1' };
    const season = await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });

    await controller.createReward(session, season.id, {
      level: 1,
      rewardType: 'soft',
      amountSoft: 100,
    });

    await expect(
      controller.createReward(session, season.id, {
        level: 1,
        rewardType: 'soft',
        amountSoft: 200,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cosmetic reward with unknown item', async () => {
    const session: any = { userId: 'admin1' };
    const season = await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });

    await expect(
      controller.createReward(session, season.id, {
        level: 2,
        rewardType: 'cosmetic',
        cosmeticItemId: 'unknown_item',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists rewards for season and allows deletion', async () => {
    const session: any = { userId: 'admin1' };
    const season = await controller.createSeason(session, {
      code: 'season_1',
      name: 'Season 1',
      startsAt: new Date().toISOString(),
      endsAt: null,
      isActive: true,
    });

    const created = await controller.createReward(session, season.id, {
      level: 1,
      rewardType: 'soft',
      amountSoft: 50,
    });

    const list = await controller.listRewards(season.id);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    const delResult = await controller.deleteReward(session, season.id, created.id);
    expect(delResult).toEqual({ success: true });
    const after = await controller.listRewards(season.id);
    expect(after).toHaveLength(0);
  });

  it('throws NotFoundException when operating on unknown season', async () => {
    await expect(
      controller.listRewards('unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

