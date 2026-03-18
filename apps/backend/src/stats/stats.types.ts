/**
 * Backend domain types for player statistics and aggregation.
 * Used when computing aggregated stats from match history (future persistence).
 */

import type { GameMode } from 'shared';

/** Single match outcome record for a player (for aggregation) */
export interface MatchOutcomeRecord {
  userId: string;
  matchId: string;
  mode: GameMode;
  isWin: boolean;
  durationMs: number;
  finishedAt: Date;
}

/** Computed streaks for a player */
export interface PlayerStreaks {
  currentWinStreak: number;
  bestWinStreak: number;
}
