import { RANKS, type Card, validateCommand } from 'game-core';
import type { BotStrategy, BotContext, BotDecision, BotActionType, BotProfile } from './bots.types';

function sortByRankAscending(cards: Card[]): Card[] {
  const order = new Map(RANKS.map((r, i) => [r, i]));
  return [...cards].sort(
    (a, b) => (order.get(a.rank) ?? 0) - (order.get(b.rank) ?? 0),
  );
}

export class BasicBotStrategy implements BotStrategy {
  readonly id = 'basic';

  decide(context: BotContext): BotDecision {
    const { game, self, bots } = context;
    const playerIndex = game.players.findIndex((p) => p.id === self.id);
    if (playerIndex === -1) return { type: 'no_action' };
    const player = game.players[playerIndex];
    const hand = player.hand;

    const selfBot = bots.find((b) => b.player.id === self.id);
    const profile: BotProfile | undefined = selfBot?.profile;

    const difficulty = profile?.difficulty ?? 'normal';
    const aggression = profile?.config.aggression ?? 0.5;
    const defenseBias = profile?.config.defenseBias ?? 0.5;
    const transferBias = profile?.config.transferBias ?? 0.7;
    const throwInBias = profile?.config.throwInBias ?? 0.6;

    const isAttacker = game.players[game.attackerIndex].id === self.id;
    const isDefender = game.players[game.defenderIndex].id === self.id;

    // Helper: check if a given action type is effectively available
    const canIssue = (type: BotActionType, card?: Card, attackIndex?: number): boolean => {
      switch (type) {
        case 'attack':
          if (!card) return false;
          return (
            validateCommand(game, { type: 'attack', playerId: self.id, card }) === null
          );
        case 'defend':
          if (!card || typeof attackIndex !== 'number') return false;
          return (
            validateCommand(game, {
              type: 'defend',
              playerId: self.id,
              attackIndex,
              card,
            }) === null
          );
        case 'throwIn':
          if (!card) return false;
          return (
            validateCommand(game, { type: 'throwIn', playerId: self.id, card }) === null
          );
        case 'transfer':
          if (!card) return false;
          return (
            validateCommand(game, { type: 'transfer', playerId: self.id, card }) ===
            null
          );
        case 'take':
          return (
            validateCommand(game, { type: 'take', playerId: self.id }) === null
          );
        case 'finishRound':
          return (
            validateCommand(game, { type: 'endTurn', playerId: self.id }) === null
          );
        case 'pass':
          return (
            validateCommand(game, { type: 'throwInPass', playerId: self.id }) === null
          );
        case 'no_action':
          return true;
      }
    };

    // Defense / transfer logic
    if (game.phase === 'defense' && isDefender) {
      const firstOpenAttackIndex = game.table.findIndex((p) => !p.defense);

      // Try transfer first in perevodnoy mode
      if (game.mode === 'perevodnoy') {
        const allowTransfer =
          difficulty === 'hard' ||
          (difficulty === 'normal' && transferBias >= 0.5);

        if (allowTransfer) {
        const transferable = sortByRankAscending(hand).find((card) =>
          canIssue('transfer', card),
        );
        if (transferable) {
          return { type: 'transfer', card: transferable };
        }
        }
      }

      if (firstOpenAttackIndex >= 0) {
        const beaters = sortByRankAscending(hand).filter((card) =>
          canIssue('defend', card, firstOpenAttackIndex),
        );
        if (beaters.length > 0) {
          // hard: максимально защищаемся (берём самую дешёвую побивающую)
          // normal: текущая логика
          // easy: часть ситуаций предпочитает take при высокой цене защиты
          const chosen =
            difficulty === 'easy' && defenseBias < 0.5 && beaters.length > 1
              ? beaters[beaters.length - 1]
              : beaters[0];

          return {
            type: 'defend',
            card: chosen,
            attackIndex: firstOpenAttackIndex,
          };
        }
      }

      // No valid defense: try to take
      if (canIssue('take')) {
        return { type: 'take' };
      }
      return { type: 'no_action' };
    }

    // Attack / throw-in logic
    if (game.phase === 'attack') {
      if (isAttacker) {
        if (game.table.length === 0) {
          // Initial attack: choose card based on difficulty
          const candidates = sortByRankAscending(hand).filter((card) =>
            canIssue('attack', card),
          );
          if (candidates.length > 0) {
            const idx =
              difficulty === 'easy'
                ? 0
                : difficulty === 'hard'
                ? Math.min(1, candidates.length - 1)
                : 0;
            return { type: 'attack', card: candidates[idx] };
          }
        } else {
          // Additional attack via throwIn
          const allowThrowIn =
            difficulty !== 'easy' || throwInBias >= 0.5;
          if (allowThrowIn) {
            const candidates = sortByRankAscending(hand).filter((card) =>
              canIssue('throwIn', card),
            );
            if (candidates.length > 0) {
              const idx =
                difficulty === 'hard'
                  ? Math.min(1, candidates.length - 1)
                  : 0;
              return { type: 'throwIn', card: candidates[idx] };
            }
          }
        }

        // Nothing more to do: finish round if allowed
        if (canIssue('finishRound')) {
          // easy: чаще заканчивает раунд
          if (difficulty === 'easy' || aggression < 0.6) {
            return { type: 'finishRound' };
          }
        }
        return { type: 'no_action' };
      }

      // Non-attacker during attack phase may be able to throw in
      if (!isDefender && game.table.length > 0) {
        const allowThrowIn =
          difficulty === 'hard' ||
          (difficulty === 'normal' && throwInBias >= 0.5);
        if (allowThrowIn) {
          const candidates = sortByRankAscending(hand).filter((card) =>
            canIssue('throwIn', card),
          );
          if (candidates.length > 0) {
            return { type: 'throwIn', card: candidates[0] };
          }
        }
        // Explicitly pass throw-in if allowed
        if (canIssue('pass')) {
          return { type: 'pass' };
        }
      }

      return { type: 'no_action' };
    }

    // Fallback: no meaningful action
    return { type: 'no_action' };
  }
}

export const basicBotStrategy = new BasicBotStrategy();

