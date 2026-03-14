import type { Command } from 'game-core';
import type { BotDecision, BotContext } from './bots.types';

export function botDecisionToCommand(context: BotContext, decision: BotDecision): Command | null {
  const playerId = context.self.id;

  switch (decision.type) {
    case 'attack':
      return decision.card
        ? {
            type: 'attack',
            playerId,
            card: decision.card,
          }
        : null;
    case 'defend':
      return decision.card != null && typeof decision.attackIndex === 'number'
        ? {
            type: 'defend',
            playerId,
            attackIndex: decision.attackIndex,
            card: decision.card,
          }
        : null;
    case 'throwIn':
      return decision.card
        ? {
            type: 'throwIn',
            playerId,
            card: decision.card,
          }
        : null;
    case 'transfer':
      return decision.card
        ? {
            type: 'transfer',
            playerId,
            card: decision.card,
          }
        : null;
    case 'take':
      return {
        type: 'take',
        playerId,
      };
    case 'finishRound':
      return {
        type: 'endTurn',
        playerId,
      };
    case 'pass':
      return {
        type: 'throwInPass',
        playerId,
      };
    case 'no_action':
    default:
      return null;
  }
}

