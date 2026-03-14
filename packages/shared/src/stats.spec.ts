import { describe, it, expect } from 'vitest';
import {
  type PlayerProfileDto,
  type PlayerAggregatedStatsDto,
  type AchievementDto,
  type PlayerProfileWithStatsDto,
  emptyAggregatedStats,
} from './stats';
import type { SeasonProgressDto } from './economy';

describe('stats DTOs', () => {
  it('PlayerProfileDto has required shape and can be serialized', () => {
    const dto: PlayerProfileDto = {
      userId: 'u1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/ava.png',
      joinedAt: '2024-01-15T10:00:00.000Z',
    };
    const json = JSON.stringify(dto);
    const parsed = JSON.parse(json) as PlayerProfileDto;
    expect(parsed.userId).toBe('u1');
    expect(parsed.displayName).toBe('Alice');
    expect(parsed.avatarUrl).toBe('https://example.com/ava.png');
    expect(parsed.joinedAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('PlayerAggregatedStatsDto has all required fields', () => {
    const dto: PlayerAggregatedStatsDto = {
      matchesPlayed: 10,
      wins: 6,
      losses: 4,
      draws: 0,
      winRate: 0.6,
      currentWinStreak: 2,
      bestWinStreak: 4,
      averageMatchDurationMs: 120_000,
      totalMatchDurationMs: 1_200_000,
      favoriteMode: 'podkidnoy',
      perModeTotals: {
        podkidnoy: { matchesPlayed: 7, wins: 5, losses: 2, draws: 0 },
        perevodnoy: { matchesPlayed: 3, wins: 1, losses: 2, draws: 0 },
      },
    };
    expect(dto.matchesPlayed).toBe(10);
    expect(dto.draws).toBe(0);
    expect(dto.winRate).toBe(0.6);
    expect(dto.bestWinStreak).toBe(4);
    expect(dto.favoriteMode).toBe('podkidnoy');
  });

  it('emptyAggregatedStats returns valid default shape', () => {
    const empty = emptyAggregatedStats();
    expect(empty.matchesPlayed).toBe(0);
    expect(empty.wins).toBe(0);
    expect(empty.losses).toBe(0);
    expect(empty.draws).toBe(0);
    expect(empty.winRate).toBe(0);
    expect(empty.currentWinStreak).toBe(0);
    expect(empty.bestWinStreak).toBe(0);
    expect(empty.averageMatchDurationMs).toBe(0);
    expect(empty.totalMatchDurationMs).toBe(0);
    expect(empty.favoriteMode).toBeNull();
    expect(empty.perModeTotals?.podkidnoy.matchesPlayed).toBe(0);
    expect(empty.perModeTotals?.perevodnoy.matchesPlayed).toBe(0);
  });

  it('AchievementDto supports unlocked and progress shape', () => {
    const unlocked: AchievementDto = {
      code: 'first_win',
      name: 'First Win',
      unlockedAt: '2024-01-20T12:00:00.000Z',
    };
    expect(unlocked.code).toBe('first_win');
    expect(unlocked.unlockedAt).toBe('2024-01-20T12:00:00.000Z');

    const progress: AchievementDto = {
      code: 'win_10',
      currentValue: 3,
      targetValue: 10,
      unlockedAt: null,
    };
    expect(progress.currentValue).toBe(3);
    expect(progress.targetValue).toBe(10);
  });

  it('PlayerProfileWithStatsDto combines profile, stats, achievements and optional season', () => {
    const full: PlayerProfileWithStatsDto = {
      profile: {
        userId: 'u1',
        displayName: 'Bob',
        joinedAt: '2024-01-01T00:00:00.000Z',
      },
      stats: emptyAggregatedStats(),
      achievements: [
        { code: 'first_win', unlockedAt: '2024-01-10T00:00:00.000Z' },
      ],
      season: {
        userId: 'u1',
        seasonId: 's1',
        level: 2,
        currentXp: 150,
        xpToNextLevel: 50,
        claimedRewardIds: [],
        updatedAt: '2024-01-20T00:00:00.000Z',
      } satisfies SeasonProgressDto,
    };
    expect(full.profile.userId).toBe('u1');
    expect(full.stats.matchesPlayed).toBe(0);
    expect(full.achievements).toHaveLength(1);
    expect(full.achievements[0].code).toBe('first_win');
    expect(full.season?.level).toBe(2);
  });
});
