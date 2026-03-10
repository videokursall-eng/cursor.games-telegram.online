import { v4 as uuidv4 } from 'uuid';
import { Card, GameState, GameType, Player, Suit, TablePair, TurnPhase } from './types';
import { beats, createDeck, RANK_VALUES, shuffleDeck } from './deck';

const HAND_SIZE = 6;

// ─── Initialization ──────────────────────────────────────────────────────────

export function createGame(
  players: Array<{ id: string; name: string; photoUrl?: string; isBot: boolean }>,
  gameType: GameType,
): GameState {
  const deck = shuffleDeck(createDeck());

  // The bottom card of the deck is the trump (visible, stays until last)
  const trump = deck[0];
  const trumpSuit: Suit = trump.suit;

  const gamePlayers: Player[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    photoUrl: p.photoUrl,
    status: p.isBot ? 'bot' : 'human',
    hand: [],
    isOut: false,
  }));

  // Deal 6 cards to each player (from top of deck)
  const remaining = [...deck];
  for (const player of gamePlayers) {
    player.hand = remaining.splice(remaining.length - HAND_SIZE, HAND_SIZE);
  }

  // Attacker: player with lowest trump card (or first player)
  const attackerIndex = findFirstAttacker(gamePlayers, trumpSuit);
  const defenderIndex = nextActiveIndex(gamePlayers, attackerIndex);

  return {
    id: uuidv4(),
    gameType,
    players: gamePlayers,
    deck: remaining,
    trump,
    trumpSuit,
    table: [],
    attackerIndex,
    defenderIndex,
    phase: 'attacking',
    passCount: 0,
    discardPile: [],
    turnNumber: 1,
    canTransfer: false,
  };
}

function findFirstAttacker(players: Player[], trumpSuit: Suit): number {
  let lowestValue = Infinity;
  let idx = 0;
  players.forEach((p, i) => {
    const trumpCards = p.hand.filter((c) => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      const min = Math.min(...trumpCards.map((c) => RANK_VALUES[c.rank]));
      if (min < lowestValue) {
        lowestValue = min;
        idx = i;
      }
    }
  });
  return idx;
}

function nextActiveIndex(players: Player[], from: number): number {
  const n = players.length;
  for (let i = 1; i < n; i++) {
    const idx = (from + i) % n;
    if (!players[idx].isOut) return idx;
  }
  return from; // shouldn't happen
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };

/** Attacker plays one or more attack cards */
export function attack(state: GameState, playerId: string, cards: Card[]): ActionResult {
  if (state.phase !== 'attacking') return err('Not attack phase');
  const attacker = state.players[state.attackerIndex];
  if (attacker.id !== playerId) return err('Not your turn to attack');
  if (cards.length === 0) return err('Must play at least one card');

  const maxAttack = 6 - state.table.length;
  const defHand = state.players[state.defenderIndex].hand;
  const maxAllowed = Math.min(maxAttack, defHand.length);
  if (cards.length > maxAllowed) return err(`Can attack with at most ${maxAllowed} cards`);

  // All attack cards must share the same rank as existing table cards (if any)
  const tableRanks = new Set(state.table.flatMap((tp) => [tp.attack.rank, tp.defense?.rank].filter(Boolean)));
  for (const card of cards) {
    if (!hasCard(attacker.hand, card)) return err(`Card ${card.id} not in hand`);
    if (tableRanks.size > 0 && !tableRanks.has(card.rank)) {
      return err(`Can only attack with ranks already on table: ${[...tableRanks].join(', ')}`);
    }
  }

  const newState = cloneState(state);
  const newAttacker = newState.players[newState.attackerIndex];
  for (const card of cards) {
    removeCard(newAttacker.hand, card);
    newState.table.push({ attack: card });
    tableRanks.add(card.rank);
  }
  newState.phase = 'defending';
  newState.canTransfer = canDoTransfer(newState);
  return ok(newState);
}

/** Defender beats one attack card with a defense card */
export function defend(
  state: GameState,
  playerId: string,
  defCard: Card,
  attackCard: Card,
): ActionResult {
  if (state.phase !== 'defending') return err('Not defense phase');
  const defender = state.players[state.defenderIndex];
  if (defender.id !== playerId) return err('Not your turn to defend');
  if (!hasCard(defender.hand, defCard)) return err(`Card ${defCard.id} not in hand`);

  const pairIdx = state.table.findIndex((tp) => tp.attack.id === attackCard.id && !tp.defense);
  if (pairIdx === -1) return err('Attack card not found or already defended');
  if (!beats(defCard, attackCard, state.trumpSuit)) return err(`${defCard.id} does not beat ${attackCard.id}`);

  const newState = cloneState(state);
  const newDefender = newState.players[newState.defenderIndex];
  removeCard(newDefender.hand, defCard);
  newState.table[pairIdx].defense = defCard;
  newState.canTransfer = false;

  // If all table cards are defended, switch phase back to allow more attacks or finish
  const allDefended = newState.table.every((tp) => tp.defense);
  if (allDefended) newState.phase = 'attacking';
  return ok(newState);
}

/** Transfer Durak: defender transfers attack to next player */
export function transfer(state: GameState, playerId: string, cards: Card[]): ActionResult {
  if (state.gameType !== 'transfer') return err('Transfer only available in переводной дурак');
  if (state.phase !== 'defending') return err('Not defense phase');
  const defender = state.players[state.defenderIndex];
  if (defender.id !== playerId) return err('Not your turn');
  if (!state.canTransfer) return err('Cannot transfer now');

  // All transfer cards must be same rank as attack cards
  const attackRank = state.table[0].attack.rank;
  for (const card of cards) {
    if (!hasCard(defender.hand, card)) return err(`Card ${card.id} not in hand`);
    if (card.rank !== attackRank) return err(`Transfer cards must match attack rank ${attackRank}`);
  }

  const nextDefIdx = nextActiveIndex(state.players, state.defenderIndex);
  const nextDef = state.players[nextDefIdx];
  const newTableSize = state.table.length + cards.length;
  if (newTableSize > nextDef.hand.length) return err('Next player does not have enough cards to defend');

  const newState = cloneState(state);
  const newDefender = newState.players[newState.defenderIndex];
  for (const card of cards) {
    removeCard(newDefender.hand, card);
    newState.table.push({ attack: card });
  }

  // Attacker becomes old defender, defender becomes next player
  newState.attackerIndex = newState.defenderIndex;
  newState.defenderIndex = nextActiveIndex(newState.players, newState.defenderIndex);
  newState.phase = 'defending';
  newState.canTransfer = canDoTransfer(newState);
  return ok(newState);
}

/** Defender takes all table cards */
export function take(state: GameState, playerId: string): ActionResult {
  if (state.phase !== 'defending' && state.phase !== 'attacking') return err('Cannot take now');
  const defender = state.players[state.defenderIndex];
  if (defender.id !== playerId) return err('Not your turn to take');

  const newState = cloneState(state);
  const newDefender = newState.players[newState.defenderIndex];

  // Give all table cards to defender
  for (const pair of newState.table) {
    newDefender.hand.push(pair.attack);
    if (pair.defense) newDefender.hand.push(pair.defense);
  }
  newState.table = [];

  // Defender is skipped as attacker next turn
  newState.attackerIndex = nextActiveIndex(newState.players, newState.defenderIndex);
  newState.defenderIndex = nextActiveIndex(newState.players, newState.attackerIndex);
  newState.phase = 'attacking';
  newState.passCount = 0;
  newState.turnNumber++;

  refillHands(newState);
  checkGameOver(newState);
  return ok(newState);
}

/** Attacker/other passes (done attacking) */
export function pass(state: GameState, playerId: string): ActionResult {
  if (state.phase !== 'attacking') return err('Not attack phase');

  // Check if it's a valid player to pass
  const passerId = playerId;
  const isAttacker = state.players[state.attackerIndex].id === passerId;
  const isOtherThanDefender = state.players.some(
    (p, i) => p.id === passerId && i !== state.defenderIndex && !p.isOut,
  );

  if (!isAttacker && !isOtherThanDefender) return err('Not your turn to pass');

  const newState = cloneState(state);
  newState.passCount++;

  // Count active non-defender players
  const activePlayers = newState.players.filter((p, i) => !p.isOut && i !== newState.defenderIndex);
  if (newState.passCount >= activePlayers.length) {
    // All attackers passed → round ends, discard table
    for (const pair of newState.table) {
      newState.discardPile.push(pair.attack);
      if (pair.defense) newState.discardPile.push(pair.defense);
    }
    newState.table = [];

    // Defender becomes next attacker
    newState.attackerIndex = newState.defenderIndex;
    newState.defenderIndex = nextActiveIndex(newState.players, newState.attackerIndex);
    newState.passCount = 0;
    newState.turnNumber++;

    refillHands(newState);
    checkGameOver(newState);
  }

  return ok(newState);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function canDoTransfer(state: GameState): boolean {
  if (state.gameType !== 'transfer') return false;
  if (state.table.length === 0) return false;
  if (state.table.some((tp) => tp.defense)) return false; // already started defending

  const attackRank = state.table[0].attack.rank;
  const allSameRank = state.table.every((tp) => tp.attack.rank === attackRank);
  if (!allSameRank) return false;

  const defender = state.players[state.defenderIndex];
  const nextDefIdx = nextActiveIndex(state.players, state.defenderIndex);
  if (nextDefIdx === state.attackerIndex) return false; // would circle back

  const nextDef = state.players[nextDefIdx];
  return defender.hand.some((c) => c.rank === attackRank) &&
    nextDef.hand.length >= state.table.length + 1;
}

function refillHands(state: GameState): void {
  // Refill attacker first, then others, defender last
  const order: number[] = [];
  let idx = state.attackerIndex;
  for (let i = 0; i < state.players.length; i++) {
    order.push(idx);
    idx = (idx + 1) % state.players.length;
  }

  for (const i of order) {
    const player = state.players[i];
    if (player.isOut) continue;
    while (player.hand.length < HAND_SIZE && state.deck.length > 0) {
      player.hand.push(state.deck.pop()!);
    }
  }
}

function checkGameOver(state: GameState): void {
  // Players with empty hands and empty deck are "out"
  for (const player of state.players) {
    if (!player.isOut && player.hand.length === 0 && state.deck.length === 0) {
      player.isOut = true;
    }
  }

  const active = state.players.filter((p) => !p.isOut);
  if (active.length <= 1) {
    state.phase = 'finished';
    if (active.length === 1) {
      state.loser = active[0].id;
    }
  }
}

function hasCard(hand: Card[], card: Card): boolean {
  return hand.some((c) => c.id === card.id);
}

function removeCard(hand: Card[], card: Card): void {
  const idx = hand.findIndex((c) => c.id === card.id);
  if (idx !== -1) hand.splice(idx, 1);
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function ok(state: GameState): ActionResult {
  return { ok: true, state };
}

function err(error: string): ActionResult {
  return { ok: false, error };
}

// ─── View helpers ─────────────────────────────────────────────────────────────

/** Returns game state with hidden cards for a specific player */
export function stateForPlayer(state: GameState, viewerId: string): GameState {
  const clone = cloneState(state);
  for (const player of clone.players) {
    if (player.id !== viewerId) {
      player.hand = player.hand.map(() => ({ suit: '♠', rank: '6', id: 'hidden' } as Card));
    }
  }
  return clone;
}
