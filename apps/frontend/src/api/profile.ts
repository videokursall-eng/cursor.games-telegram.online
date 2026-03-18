import { api } from './client';

export interface PlayerProfileDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
  isAdmin?: boolean;
}

export type GameModeStats = 'podkidnoy' | 'perevodnoy';

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

export interface AchievementDto {
  code: string;
  name?: string;
  description?: string;
  icon?: string;
  unlockedAt: string | null;
  currentValue?: number;
  targetValue?: number;
}

export interface SeasonProgressDto {
  userId: string;
  seasonId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  claimedRewardIds: string[];
  updatedAt: string;
}

export interface PlayerProfileWithStatsDto {
  profile: PlayerProfileDto;
  stats: PlayerAggregatedStatsDto;
  achievements: AchievementDto[];
  season?: SeasonProgressDto | null;
}

export async function fetchMyProfile(token: string | null) {
  return api<PlayerProfileWithStatsDto>('/me/profile', { token });
}

