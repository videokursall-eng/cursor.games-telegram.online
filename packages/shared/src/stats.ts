/**
 * Shared DTOs and contracts for player profile, match statistics, aggregated stats, streaks, achievements, seasonal progress.
 */

import type { SeasonProgressDto } from './economy';

export type GameModeStats = 'podkidnoy' | 'perevodnoy';

/** Public player profile (display) */
export interface PlayerProfileDto {
  userId: string;
  displayName: string;
  /** Avatar URL or placeholder key (e.g. "default") */
  avatarUrl?: string | null;
  joinedAt: string;
  /** Optional admin flag for admin-panel access. */
  isAdmin?: boolean;
}

/** Per-match statistics snapshot (for aggregation) */
export interface MatchStatsSnapshotDto {
  matchId: string;
  userId: string;
  mode: GameModeStats;
  isWin: boolean;
  durationMs: number;
  finishedAt: string;
}

/** Aggregated player statistics */
export interface PlayerAggregatedStatsDto {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  averageMatchDurationMs: number;
  totalMatchDurationMs: number;
  favoriteMode: GameModeStats | null;
  perModeTotals?: Record<
    GameModeStats,
    {
      matchesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    }
  >;
}

/** Single achievement (unlock progress + metadata) */
export interface AchievementDto {
  code: string;
  /** Human readable name (title) */
  name?: string;
  /** Optional description for UI */
  description?: string;
  /** Optional icon / badge key (can be emoji) */
  icon?: string;
  unlockedAt: string | null;
  /** Optional progress for incremental achievements */
  currentValue?: number;
  targetValue?: number;
}

/** Full profile + stats + achievements (API response) */
export interface PlayerProfileWithStatsDto {
  profile: PlayerProfileDto;
  stats: PlayerAggregatedStatsDto;
  achievements: AchievementDto[];
  /** Optional seasonal progress block (does not affect match strength). */
  season?: SeasonProgressDto | null;
}

/** Default empty aggregated stats shape */
export function emptyAggregatedStats(): PlayerAggregatedStatsDto {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    averageMatchDurationMs: 0,
    totalMatchDurationMs: 0,
    favoriteMode: null,
    perModeTotals: {
      podkidnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      perevodnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
    },
  };
}
