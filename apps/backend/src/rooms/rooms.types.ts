export type RoomMode = 'podkidnoy' | 'perevodnoy';

export type RoomStatus = 'lobby' | 'in_progress' | 'finished';

export interface RoomPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isOwner: boolean;
  type?: 'human' | 'bot';
  botProfile?: {
    profileId: string;
    strategyId: string;
    difficulty: 'easy' | 'normal' | 'hard';
  } | null;
}

import type { GameState } from 'game-core';

export type MatchOutcome = 'normal' | 'draw' | 'aborted';

export interface PerPlayerMatchStats {
  playerId: string;
  turnsMade: number;
  cardsTaken: number;
  defensesMade: number;
  attacksMade: number;
  transfersMade: number;
  throwInsMade: number;
  finishedPlace?: number;
}

export interface MatchStats {
  totalTurns: number;
  totalRounds: number;
  durationSeconds: number;
  totalCardsTaken: number;
  perPlayer: PerPlayerMatchStats[];
}

export interface MatchResult {
  winnerIds: string[];
  loserId?: string | null;
  finishOrder: string[];
  placements: { playerId: string; place: number }[];
  outcome: MatchOutcome;
  stats: MatchStats;
}

export interface RoomState {
  id: string;
  mode: RoomMode;
  maxPlayers: number;
  players: RoomPlayer[];
  bots: RoomPlayer[];
  ownerId: string;
  status: RoomStatus;
  isPrivate: boolean;
  inviteCode: string;
  turn: number;
  game?: GameState;
  matchResult?: MatchResult;
  matchStats: MatchStats;
  matchStartedAt?: number;
  turnStartedAt?: number;
  turnDurationSeconds?: number;
  /** Итоговый разрешённый таймаут текущего хода в мс */
  turnTimeoutMs: number;
  /** Абсолютный дедлайн текущего хода в мс since epoch */
  turnDeadlineAt?: number;
  /** Сообщение о последнем auto-action по таймауту */
  lastAutoActionMessage?: string | null;
  /** Переопределение таймаута на уровне комнаты/матча (мс) */
  overrideTurnTimeoutMs?: number;
  /** Переопределения таймаута на уровне игроков (мс) */
  perPlayerTimeoutMs?: Record<string, number>;
}

