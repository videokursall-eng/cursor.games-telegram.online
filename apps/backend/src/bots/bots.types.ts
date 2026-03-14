import type { Card, GameState } from 'game-core';
import type { RoomPlayer, RoomMode } from '../rooms/rooms.types';

export type BotActionType =
  | 'attack'
  | 'defend'
  | 'throwIn'
  | 'transfer'
  | 'take'
  | 'finishRound'
  | 'pass'
  | 'no_action';

export interface BotDecision {
  type: BotActionType;
  /** Optional concrete card to use for attack/defense/throwIn/transfer */
  card?: Card;
  /** Optional attack index for defend decisions */
  attackIndex?: number;
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface BotProfile {
  id: string;
  displayName: string;
  strategyId: string;
  difficulty: BotDifficulty;
  config: {
    aggression: number;
    defenseBias: number;
    transferBias: number;
    throwInBias: number;
  };
}

export interface BotParticipant {
  player: RoomPlayer;
  profile: BotProfile;
}

export interface BotContext {
  roomId: string;
  mode: RoomMode;
  turn: number;
  self: RoomPlayer;
  players: RoomPlayer[];
  bots: BotParticipant[];
  game: GameState;
}

export interface BotStrategy {
  id: string;
  decide(context: BotContext): BotDecision;
}

