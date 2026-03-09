import type { Card, Command, GameMode } from "../game-engine/engine";

export type BotLevel = "easy" | "medium" | "hard";

export interface BotContext {
  playerId: number;
  mode: GameMode;
  visibleHand: Card[];
  table: {
    attack: Card;
    defence?: Card;
  }[];
  trumpSuit: Card["suit"];
  maxTableCards: number;
  defenderHandSize: number;
  nextDefenderHandSize?: number;
}

export interface BotDecision {
  command: Command | null;
}

