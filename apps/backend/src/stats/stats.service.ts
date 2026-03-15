import { Injectable } from '@nestjs/common';
import type {
  PlayerProfileDto,
  PlayerAggregatedStatsDto,
  PlayerProfileWithStatsDto,
  AchievementDto,
  GameModeStats,
} from 'shared';
import { emptyAggregatedStats } from 'shared';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { MatchResult } from '../rooms/rooms.types';

/** Match outcome for DB (PlayerMatchRecord.outcome). Aligns with prisma/schema.prisma enum MatchOutcome. */
type PrismaMatchOutcome = 'WIN' | 'LOSS' | 'DRAW';
import { ACHIEVEMENTS } from './achievements.config';
import { resolveAchievementMeta } from 'shared';
import { WalletService } from '../economy/wallet.service';
import { SeasonProgressService } from '../season/season-progress.service';

const ROOM_MODE_TO_DB: Record<GameModeStats, string> = {
  podkidnoy: 'podkidnoy',
  perevodnoy: 'perevodnoy',
};

@Injectable()
export class StatsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly seasonProgressService: SeasonProgressService,
  ) {}

  async getProfileWithStats(userId: string): Promise<PlayerProfileWithStatsDto | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;

    const profile = this.toProfileDto(user);
    const stats = await this.getAggregatedStats(userId);
    const achievements = await this.getAchievements(userId);
    let season: PlayerProfileWithStatsDto['season'] = null;
    try {
      season = await this.seasonProgressService.getProgress(user.id);
    } catch {
      season = null;
    }

    return { profile, stats, achievements, season };
  }

  toProfileDto(user: { id: string; firstName: string; lastName?: string; photoUrl?: string; createdAt: Date; telegramId: number }): PlayerProfileDto {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Player';
    const raw = process.env.ADMIN_TELEGRAM_IDS;
    const isAdmin =
      !!raw &&
      raw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .includes(String(user.telegramId));
    return {
      userId: user.id,
      displayName,
      avatarUrl: user.photoUrl ?? null,
      joinedAt: user.createdAt.toISOString(),
      isAdmin,
    };
  }

  async getAggregatedStats(userId: string): Promise<PlayerAggregatedStatsDto> {
    const records = await this.prisma.playerMatchRecord.findMany({
      where: { userId },
      orderBy: { finishedAt: 'asc' },
    });

    if (records.length === 0) return emptyAggregatedStats();

    const wins = records.filter((r) => r.outcome === 'WIN').length;
    const losses = records.filter((r) => r.outcome === 'LOSS').length;
    const draws = records.filter((r) => r.outcome === 'DRAW').length;
    const matchesPlayed = records.length;
    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

    let currentWinStreak = 0;
    for (let i = records.length - 1; i >= 0 && records[i]!.outcome === 'WIN'; i--) currentWinStreak++;

    let bestWinStreak = 0;
    let run = 0;
    for (const r of records) {
      if (r.outcome === 'WIN') {
        run++;
        bestWinStreak = Math.max(bestWinStreak, run);
      } else run = 0;
    }

    const totalMatchDurationMs = records.reduce((s, r) => s + r.durationMs, 0);
    const averageMatchDurationMs = matchesPlayed > 0 ? Math.round(totalMatchDurationMs / matchesPlayed) : 0;

    const byMode: Record<GameModeStats, number> = { podkidnoy: 0, perevodnoy: 0 };
    for (const r of records) {
      if (r.mode === 'podkidnoy') byMode.podkidnoy++;
      else if (r.mode === 'perevodnoy') byMode.perevodnoy++;
    }
    const favoriteMode: GameModeStats | null =
      byMode.podkidnoy >= byMode.perevodnoy && byMode.podkidnoy > 0
        ? 'podkidnoy'
        : byMode.perevodnoy > 0
          ? 'perevodnoy'
          : null;

    const perModeTotals: NonNullable<PlayerAggregatedStatsDto['perModeTotals']> = {
      podkidnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      perevodnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
    };
    for (const r of records) {
      const modeKey = r.mode === 'perevodnoy' ? 'perevodnoy' : 'podkidnoy';
      const bucket = perModeTotals[modeKey];
      bucket.matchesPlayed += 1;
      if (r.outcome === 'WIN') bucket.wins += 1;
      else if (r.outcome === 'LOSS') bucket.losses += 1;
      else bucket.draws += 1;
    }

    return {
      matchesPlayed,
      wins,
      losses,
      draws,
      winRate,
      currentWinStreak,
      bestWinStreak,
      averageMatchDurationMs,
      totalMatchDurationMs,
      favoriteMode,
      perModeTotals,
    };
  }

  async getAchievements(userId: string): Promise<AchievementDto[]> {
    const list = await this.prisma.achievementProgress.findMany({
      where: { userId },
    });
    return list.map((a) => {
      const meta = resolveAchievementMeta(a.code);
      return {
        code: a.code,
        name: meta?.name,
        description: meta?.description,
        icon: meta?.icon,
        unlockedAt: a.completedAt ? a.completedAt.toISOString() : null,
        currentValue: a.currentValue,
        targetValue: a.targetValue,
      };
    });
  }

  /**
   * Persist match result for each human player and update achievement progress.
   */
  async recordMatchComplete(
    matchId: string,
    mode: 'podkidnoy' | 'perevodnoy',
    matchStartedAt: number,
    humanPlayerIds: string[],
    matchResult: MatchResult,
  ): Promise<void> {
    const durationMs = Math.max(0, Math.round((Date.now() - matchStartedAt) / 1) * 1);
    const finishedAt = new Date();
    const dbMode = ROOM_MODE_TO_DB[mode];

    for (const playerId of humanPlayerIds) {
      let outcome: PrismaMatchOutcome = 'DRAW';
      if (matchResult.outcome === 'normal') {
        if (matchResult.winnerIds.includes(playerId)) outcome = 'WIN';
        else if (matchResult.loserId === playerId) outcome = 'LOSS';
      }

      await this.prisma.playerMatchRecord.create({
        data: {
          userId: playerId,
          matchId,
          mode: dbMode,
          outcome,
          durationMs,
          finishedAt,
        },
      });
      await this.updateAchievementsForUser(playerId);

      // Economy: award soft currency for completed match (non pay-to-win).
      // Base reward for participation + small bonus for win; no reward for aborted matches.
      let reward = 0;
      if (matchResult.outcome === 'normal') {
        reward = 10; // participation
        if (outcome === 'WIN') reward += 5;
      } else if (matchResult.outcome === 'draw') {
        reward = 8;
      } else if (matchResult.outcome === 'aborted') {
        reward = 0;
      }

      if (reward > 0) {
        await this.walletService.credit(playerId, reward, 'match_reward', {
          matchId,
          mode,
          outcome,
        });
      }

      await this.seasonProgressService.addMatchXp({
        userId: playerId,
        matchId,
        mode,
        matchOutcome: matchResult.outcome,
        playerOutcome: outcome,
      });
    }
  }

  private async updateAchievementsForUser(userId: string): Promise<void> {
    const records = await this.prisma.playerMatchRecord.findMany({
      where: { userId },
      orderBy: { finishedAt: 'asc' },
    });

    const wins = records.filter((r) => r.outcome === 'WIN').length;
    const matchesPlayed = records.length;
    let maxWinStreak = 0;
    let run = 0;
    for (const r of records) {
      if (r.outcome === 'WIN') {
        run++;
        maxWinStreak = Math.max(maxWinStreak, run);
      } else run = 0;
    }
    const winsPerevodnoy = records.filter((r) => r.outcome === 'WIN' && r.mode === 'PEREVODNOY').length;

    const now = new Date();
    for (const def of ACHIEVEMENTS) {
      let currentValue = 0;
      if (def.code === 'first_match' || def.code === 'matches_10') currentValue = Math.min(matchesPlayed, def.targetValue);
      else if (def.code === 'first_win' || def.code === 'win_perevodnoy') currentValue = def.code === 'first_win' ? Math.min(wins, 1) : Math.min(winsPerevodnoy, 1);
      else if (def.code === 'win_streak_3') currentValue = maxWinStreak >= def.targetValue ? def.targetValue : Math.min(maxWinStreak, def.targetValue);

      await this.prisma.achievementProgress.upsert({
        where: { userId_code: { userId, code: def.code } },
        create: {
          userId,
          code: def.code,
          currentValue,
          targetValue: def.targetValue,
          completedAt: currentValue >= def.targetValue ? now : null,
        },
        update: {
          currentValue,
          updatedAt: now,
          completedAt: currentValue >= def.targetValue ? now : undefined,
        },
      });
    }
  }
}
