import { Card, GameState, Suit } from './types';
import { beats, RANK_VALUES } from './deck';

/**
 * Simple rule-based bot AI for Durak.
 * Returns the action the bot should take.
 */

export type BotAction =
  | { type: 'attack'; cards: Card[] }
  | { type: 'defend'; defCard: Card; attackCard: Card }
  | { type: 'transfer'; cards: Card[] }
  | { type: 'take' }
  | { type: 'pass' };

export function getBotAction(state: GameState, botId: string): BotAction | null {
  const botIdx = state.players.findIndex((p) => p.id === botId);
  if (botIdx === -1) return null;

  const bot = state.players[botIdx];
  const isAttacker = botIdx === state.attackerIndex;
  const isDefender = botIdx === state.defenderIndex;

  if (state.phase === 'attacking' && isAttacker) {
    return getBotAttack(state, bot.hand);
  }

  if (state.phase === 'attacking' && !isAttacker && !isDefender) {
    // Co-attacker: add cards if possible
    return getBotCoAttack(state, bot.hand);
  }

  if (state.phase === 'defending' && isDefender) {
    // Try transfer first (if available)
    if (state.canTransfer && state.gameType === 'transfer') {
      const transfer = getBotTransfer(state, bot.hand);
      if (transfer) return transfer;
    }
    return getBotDefend(state, bot.hand);
  }

  return null;
}

function getBotAttack(state: GameState, hand: Card[]): BotAction {
  const tableRanks = new Set(
    state.table.flatMap((tp) => [tp.attack.rank, tp.defense?.rank].filter(Boolean)),
  );

  const defHand = state.players[state.defenderIndex].hand;
  const maxCards = Math.min(6 - state.table.length, defHand.length);

  if (state.table.length === 0) {
    // First attack: play lowest non-trump card
    const playable = sortByStrength(hand, state.trumpSuit, false);
    const card = playable[0];
    return { type: 'attack', cards: [card] };
  }

  // Add more cards with matching ranks
  const matches = hand.filter((c) => tableRanks.has(c.rank));
  if (matches.length > 0 && maxCards > 0) {
    return { type: 'attack', cards: [matches[0]] };
  }

  return { type: 'pass' };
}

function getBotCoAttack(state: GameState, hand: Card[]): BotAction {
  const tableRanks = new Set(
    state.table.flatMap((tp) => [tp.attack.rank, tp.defense?.rank].filter(Boolean)),
  );
  const defHand = state.players[state.defenderIndex].hand;
  const maxCards = Math.min(6 - state.table.length, defHand.length);

  if (maxCards > 0 && tableRanks.size > 0) {
    const matches = hand.filter((c) => tableRanks.has(c.rank));
    if (matches.length > 0) {
      return { type: 'attack', cards: [matches[0]] };
    }
  }

  return { type: 'pass' };
}

function getBotDefend(state: GameState, hand: Card[]): BotAction {
  // Find the first undefended attack card
  const undefended = state.table.find((tp) => !tp.defense);
  if (!undefended) return { type: 'pass' };

  const attackCard = undefended.attack;

  // Find cheapest card that can beat it
  const candidates = hand.filter((c) => beats(c, attackCard, state.trumpSuit));
  if (candidates.length === 0) return { type: 'take' };

  const cheapest = sortByStrength(candidates, state.trumpSuit, false)[0];
  return { type: 'defend', defCard: cheapest, attackCard };
}

function getBotTransfer(state: GameState, hand: Card[]): BotAction | null {
  const attackRank = state.table[0].attack.rank;
  const transferCards = hand.filter((c) => c.rank === attackRank);
  if (transferCards.length === 0) return null;

  const nextDefIdx = nextActive(state.players, state.defenderIndex);
  const nextDef = state.players[nextDefIdx];
  if (nextDef.hand.length < state.table.length + transferCards.length) return null;

  // Only transfer if it seems beneficial (next player weaker)
  return { type: 'transfer', cards: [transferCards[0]] };
}

function sortByStrength(cards: Card[], trumpSuit: Suit, descending: boolean): Card[] {
  return [...cards].sort((a, b) => {
    const aVal = RANK_VALUES[a.rank] + (a.suit === trumpSuit ? 100 : 0);
    const bVal = RANK_VALUES[b.rank] + (b.suit === trumpSuit ? 100 : 0);
    return descending ? bVal - aVal : aVal - bVal;
  });
}

function nextActive(players: GameState['players'], from: number): number {
  const n = players.length;
  for (let i = 1; i < n; i++) {
    const idx = (from + i) % n;
    if (!players[idx].isOut) return idx;
  }
  return from;
}
