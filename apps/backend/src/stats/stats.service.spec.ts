import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../prisma/prisma.service.mock';
import { WalletService } from '../economy/wallet.service';
import { SeasonProgressService } from '../season/season-progress.service';

describe('StatsService', () => {
  let service: StatsService;
  let usersService: UsersService;
  const mockWallet: { credit: jest.Mock } = { credit: jest.fn() };
  const mockSeason: { addMatchXp: jest.Mock; getProgress: jest.Mock } = {
    addMatchXp: jest.fn(),
    getProgress: jest.fn(),
  };

  beforeEach(async () => {
    mockWallet.credit.mockReset();
    mockSeason.addMatchXp.mockReset();
    mockSeason.getProgress.mockReset();
    mockSeason.getProgress.mockResolvedValue({
      userId: 'u-season',
      seasonId: 's1',
      level: 1,
      currentXp: 0,
      xpToNextLevel: 100,
      claimedRewardIds: [],
      updatedAt: new Date(0).toISOString(),
    });
    const module: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        StatsService,
        { provide: WalletService, useValue: mockWallet },
        { provide: SeasonProgressService, useValue: mockSeason },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    service = module.get<StatsService>(StatsService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('toProfileDto builds profile from user', () => {
    const user = {
      id: 'u1',
      firstName: 'Alice',
      lastName: 'Smith',
      photoUrl: 'https://t.me/ava.png',
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      telegramId: 123,
    };
    const dto = service.toProfileDto(user);
    expect(dto.userId).toBe('u1');
    expect(dto.displayName).toBe('Alice Smith');
    expect(dto.avatarUrl).toBe('https://t.me/ava.png');
    expect(dto.joinedAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('toProfileDto uses "Player" when name empty', () => {
    const user = {
      id: 'u2',
      firstName: '',
      lastName: '',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      telegramId: 456,
    };
    const dto = service.toProfileDto(user);
    expect(dto.displayName).toBe('Player');
  });

  it('getAggregatedStats returns empty shape', async () => {
    const stats = await service.getAggregatedStats('any');
    expect(stats.matchesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.currentWinStreak).toBe(0);
    expect(stats.bestWinStreak).toBe(0);
    expect(stats.favoriteMode).toBeNull();
  });

  it('getAchievements returns empty array', async () => {
    const achievements = await service.getAchievements('any');
    expect(achievements).toEqual([]);
  });

  it('getAggregatedStats computes from records when present', async () => {
    const mockPrisma = createMockPrismaService({
      playerMatchRecord: {
        findMany: async () => [
          { outcome: 'WIN', mode: 'podkidnoy', durationMs: 100_000, finishedAt: new Date('2024-01-01T10:00:00Z') },
          { outcome: 'WIN', mode: 'podkidnoy', durationMs: 80_000, finishedAt: new Date('2024-01-02T10:00:00Z') },
          { outcome: 'LOSS', mode: 'perevodnoy', durationMs: 120_000, finishedAt: new Date('2024-01-03T10:00:00Z') },
        ],
        create: async () => ({}),
      } as never,
    });
    const moduleWithData = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        StatsService,
        { provide: WalletService, useValue: mockWallet },
        { provide: SeasonProgressService, useValue: mockSeason },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();
    const svc = moduleWithData.get<StatsService>(StatsService);
    const stats = await svc.getAggregatedStats('u1');
    expect(stats.matchesPlayed).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(0);
    expect(stats.winRate).toBeCloseTo(2 / 3);
    expect(stats.currentWinStreak).toBe(0);
    expect(stats.bestWinStreak).toBe(2);
    expect(stats.totalMatchDurationMs).toBe(300_000);
    expect(stats.averageMatchDurationMs).toBe(100_000);
    expect(stats.favoriteMode).toBe('podkidnoy');
  });

  it('getAchievements returns progress when present', async () => {
    const mockPrisma = createMockPrismaService({
      achievementProgress: {
        findMany: async () => [
          { code: 'first_match', completedAt: new Date('2024-01-01T00:00:00Z'), currentValue: 1, targetValue: 1 },
          { code: 'first_win', completedAt: null, currentValue: 0, targetValue: 1 },
        ],
        upsert: async () => ({}),
      } as never,
    });
    const moduleWithData = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        StatsService,
        { provide: WalletService, useValue: mockWallet },
        { provide: SeasonProgressService, useValue: mockSeason },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();
    const svc = moduleWithData.get<StatsService>(StatsService);
    const achievements = await svc.getAchievements('u1');
    expect(achievements).toHaveLength(2);
    expect(achievements[0]).toMatchObject({
      code: 'first_match',
      name: 'Первая партия',
      unlockedAt: '2024-01-01T00:00:00.000Z',
      currentValue: 1,
      targetValue: 1,
    });
    expect(achievements[1]).toMatchObject({
      code: 'first_win',
      name: 'Первая победа',
      unlockedAt: null,
      currentValue: 0,
      targetValue: 1,
    });
  });

  it('getProfileWithStats returns null for unknown user', async () => {
    const result = await service.getProfileWithStats('unknown-id');
    expect(result).toBeNull();
  });

  it('getProfileWithStats returns profile + empty stats + empty achievements for existing user', async () => {
    const user = await usersService.createOrUpdateFromTelegram({
      id: 123,
      first_name: 'Test',
      last_name: 'User',
    });
    const result = await service.getProfileWithStats(user.id);
    expect(result).not.toBeNull();
    expect(result!.profile.userId).toBe(user.id);
    expect(result!.profile.displayName).toBe('Test User');
    expect(result!.profile.joinedAt).toBe(user.createdAt.toISOString());
    expect(result!.stats.matchesPlayed).toBe(0);
    expect(result!.achievements).toEqual([]);
  });

  it('recordMatchComplete writes records and updates stats for normal finish', async () => {
    const records: { userId: string; matchId: string; mode: string; outcome: string; durationMs: number; finishedAt: Date }[] = [];
    const mockPrisma = createMockPrismaService({
      playerMatchRecord: {
        findMany: async () => [...records],
        create: async (args: { data: (typeof records)[number] }) => {
          records.push({ ...args.data });
          return args.data;
        },
      } as never,
      achievementProgress: {
        findMany: async () => [],
        upsert: async () => ({}),
      } as never,
    });

    const moduleWithData = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        StatsService,
        { provide: WalletService, useValue: mockWallet },
        { provide: SeasonProgressService, useValue: mockSeason },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    const svc = moduleWithData.get<StatsService>(StatsService);

    const base = Date.now();
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => base + 10_000);
    await svc.recordMatchComplete(
      'm1',
      'podkidnoy',
      base,
      ['u1'],
      {
        winnerIds: ['u1'],
        loserId: 'u2',
        finishOrder: ['u1', 'u2'],
        placements: [{ playerId: 'u1', place: 1 }],
        outcome: 'normal',
        stats: {
          totalTurns: 10,
          totalRounds: 3,
          durationSeconds: 10,
          totalCardsTaken: 0,
          perPlayer: [],
        },
      },
    );

    const stats = await svc.getAggregatedStats('u1');
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.currentWinStreak).toBe(1);
    expect(stats.bestWinStreak).toBe(1);
    expect(stats.totalMatchDurationMs).toBeGreaterThanOrEqual(10_000);
    expect(stats.favoriteMode).toBe('podkidnoy');
    expect(mockWallet.credit).toHaveBeenCalledTimes(1);
    expect(mockWallet.credit).toHaveBeenCalledWith(
      'u1',
      expect.any(Number),
      'match_reward',
      expect.objectContaining({ matchId: 'm1', mode: 'podkidnoy' }),
    );
  });

  it('recordMatchComplete handles draw and aborted without false wins/losses', async () => {
    const records: { userId: string; matchId: string; mode: string; outcome: string; durationMs: number; finishedAt: Date }[] = [];
    const mockPrisma = createMockPrismaService({
      playerMatchRecord: {
        findMany: async () => [...records],
        create: async (args: { data: (typeof records)[number] }) => {
          records.push({ ...args.data });
          return args.data;
        },
      } as never,
      achievementProgress: {
        findMany: async () => [],
        upsert: async () => ({}),
      } as never,
    });

    const moduleWithData = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        StatsService,
        { provide: WalletService, useValue: mockWallet },
        { provide: SeasonProgressService, useValue: mockSeason },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    const svc = moduleWithData.get<StatsService>(StatsService);

    await svc.recordMatchComplete(
      'm-draw',
      'perevodnoy',
      Date.now(),
      ['u1'],
      {
        winnerIds: [],
        loserId: null,
        finishOrder: [],
        placements: [],
        outcome: 'draw',
        stats: {
          totalTurns: 5,
          totalRounds: 2,
          durationSeconds: 5,
          totalCardsTaken: 0,
          perPlayer: [],
        },
      },
    );

    await svc.recordMatchComplete(
      'm-aborted',
      'perevodnoy',
      Date.now(),
      ['u1'],
      {
        winnerIds: [],
        loserId: null,
        finishOrder: [],
        placements: [],
        outcome: 'aborted',
        stats: {
          totalTurns: 1,
          totalRounds: 1,
          durationSeconds: 1,
          totalCardsTaken: 0,
          perPlayer: [],
        },
      },
    );

    const stats = await svc.getAggregatedStats('u1');
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(2);
    expect(stats.currentWinStreak).toBe(0);
    expect(stats.bestWinStreak).toBe(0);
    expect(stats.favoriteMode).toBe('perevodnoy');
    // draw and aborted should award at most one non-zero reward and no reward for aborted
    expect(mockWallet.credit).toHaveBeenCalledTimes(1);
    const call = mockWallet.credit.mock.calls[0];
    expect(call[0]).toBe('u1');
    expect(call[2]).toBe('match_reward');
  });
});
