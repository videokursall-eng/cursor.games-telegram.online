import { RANKS, type Card, type Rank, type Suit } from './cards';

export type GameMode = 'podkidnoy' | 'perevodnoy';

export interface PlayerState {
  id: string;
  hand: Card[];
  isBot: boolean;
  isOut: boolean;
}

export interface TablePair {
  attack: Card;
  defense?: Card;
}

export type Phase = 'attack' | 'defense' | 'cleanup';

export interface PlayerStats {
  playerId: string;
  turnsMade: number;
  cardsTaken: number;
  defensesMade: number;
  attacksMade: number;
  transfersMade: number;
  throwInsMade: number;
  finishedPlace?: number;
}

export type MatchOutcome = 'normal' | 'draw' | 'aborted';

export interface GameStats {
  totalTurns: number;
  totalRounds: number;
  totalCardsTaken: number;
  finishOrder: string[];
  perPlayer: PlayerStats[];
  outcome: MatchOutcome;
}

export interface GameState {
  id: string;
  mode: GameMode;
  players: PlayerState[];
  deck: Card[];
  discard: Card[];
  trump: Suit;
  attackerIndex: number;
  defenderIndex: number;
  phase: Phase;
  table: TablePair[];
  pendingTake: boolean;
  pendingTakePlayerId?: string | null;
  finished: boolean;
  loserId?: string;
  stats: GameStats;
  /** Игроки, которые уже завершили участие в текущей фазе подкидывания (не могут больше делать throwIn до конца раунда) */
  throwInPassedPlayerIds?: string[];
}

export type Command =
  | { type: 'attack'; playerId: string; card: Card }
  | { type: 'defend'; playerId: string; attackIndex: number; card: Card }
  | { type: 'throwIn'; playerId: string; card: Card }
  | { type: 'transfer'; playerId: string; card: Card }
  | { type: 'take'; playerId: string }
  | { type: 'endTurn'; playerId: string }
  | { type: 'throwInPass'; playerId: string };

export interface ValidationError {
  reason: string;
}

export function createInitialState(
  id: string,
  mode: GameMode,
  playerIds: string[],
  trumpSuit: Suit,
  deck: Card[],
): GameState {
  if (playerIds.length < 2 || playerIds.length > 6) {
    throw new Error('Durak supports 2–6 players');
  }
  // Deal up to 6 cards to each player in order.
  const players: PlayerState[] = playerIds.map((pid) => ({ id: pid, hand: [], isBot: false, isOut: false }));
  const workingDeck = [...deck];
  for (let round = 0; round < 6; round++) {
    for (const p of players) {
      if (!workingDeck.length) break;
      p.hand.push(workingDeck.shift()!);
    }
  }

  const perPlayer: PlayerStats[] = playerIds.map((pid) => ({
    playerId: pid,
    turnsMade: 0,
    cardsTaken: 0,
    defensesMade: 0,
    attacksMade: 0,
    transfersMade: 0,
    throwInsMade: 0,
    finishedPlace: undefined,
  }));

  return {
    id,
    mode,
    players,
    deck: workingDeck,
    discard: [],
    trump: trumpSuit,
    attackerIndex: 0,
    defenderIndex: players.length > 1 ? 1 : 0,
    phase: 'attack',
    table: [],
    pendingTake: false,
    pendingTakePlayerId: null,
    finished: false,
    loserId: undefined,
    stats: {
      totalTurns: 0,
      totalRounds: 0,
      totalCardsTaken: 0,
      finishOrder: [],
      perPlayer,
      outcome: 'normal',
    },
    throwInPassedPlayerIds: [],
  };
}

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

function isTrump(card: Card, trump: Suit): boolean {
  return card.suit === trump;
}

function canBeat(attacking: Card, defending: Card, trump: Suit): boolean {
  if (defending.suit === attacking.suit) {
    return rankValue(defending.rank) > rankValue(attacking.rank);
  }
  if (isTrump(defending, trump) && !isTrump(attacking, trump)) {
    return true;
  }
  return false;
}

function allRanksOnTable(table: TablePair[]): Set<Rank> {
  const set = new Set<Rank>();
  for (const pair of table) {
    set.add(pair.attack.rank);
    if (pair.defense) set.add(pair.defense.rank);
  }
  return set;
}

function nextDefenderIndexForTransfer(state: GameState): number | null {
  const n = state.players.length;
  if (n <= 2) return null;
  let idx = state.defenderIndex;
  for (let i = 0; i < n - 1; i++) {
    idx = (idx + 1) % n;
    const candidate = state.players[idx];
    if (!candidate.isOut) {
      return idx;
    }
  }
  return null;
}

export function validateCommand(state: GameState, command: Command): ValidationError | null {
  if (state.finished) {
    return { reason: 'Game already finished' };
  }

  const playerIndex = state.players.findIndex((p) => p.id === command.playerId);
  if (playerIndex === -1) return { reason: 'Unknown player' };
  const player = state.players[playerIndex];
  if (player.isOut) return { reason: 'Player already out' };

  const attacker = state.players[state.attackerIndex];
  const defender = state.players[state.defenderIndex];

  switch (command.type) {
    case 'attack': {
      if (state.phase !== 'attack') return { reason: 'Not attack phase' };
      if (player.id !== attacker.id) return { reason: 'Only attacker can start attack' };
      if (!hasCard(player, command.card)) return { reason: 'Card not in hand' };
      if (state.table.length >= defender.hand.length) return { reason: 'Too many cards on table' };
      // First attack is always allowed; others handled as throw-in.
      if (state.table.length > 0) return { reason: 'Use throwIn for additional cards' };
      return null;
    }
    case 'throwIn': {
      if (state.phase !== 'attack' && state.phase !== 'defense') {
        return { reason: 'Cannot throw in in this phase' };
      }
      if (player.id === defender.id && state.phase === 'defense') {
        return { reason: 'Defender cannot throw in' };
      }
      if (state.throwInPassedPlayerIds && state.throwInPassedPlayerIds.includes(player.id)) {
        return { reason: 'Player has already passed throw-in this round' };
      }
      if (!hasCard(player, command.card)) return { reason: 'Card not in hand' };
      if (!state.table.length) return { reason: 'No cards on table yet' };
      if (state.table.length >= defender.hand.length) return { reason: 'Too many cards on table' };
      const ranks = allRanksOnTable(state.table);
      if (!ranks.has(command.card.rank)) {
        return { reason: 'Thrown card rank must match rank on table' };
      }
      return null;
    }
    case 'transfer': {
      if (state.mode !== 'perevodnoy') {
        return { reason: 'Transfer only allowed in perevodnoy mode' };
      }
      if (state.phase !== 'defense') {
        return { reason: 'Transfer only allowed during defense' };
      }
      if (player.id !== defender.id) {
        return { reason: 'Only defender can transfer' };
      }
      if (!hasCard(player, command.card)) return { reason: 'Card not in hand' };
      if (!state.table.length) return { reason: 'No cards on table yet' };
      const ranks = allRanksOnTable(state.table);
      if (!ranks.has(command.card.rank)) {
        return { reason: 'Transfer card rank must match rank on table' };
      }
      const nextIdx = nextDefenderIndexForTransfer(state);
      if (nextIdx === null) {
        return { reason: 'No player to transfer to' };
      }
      const nextDefender = state.players[nextIdx];
      const cardsOnTableAfter = state.table.length + 1;
      if (nextDefender.hand.length < cardsOnTableAfter) {
        return { reason: 'Next defender does not have enough cards' };
      }
      return null;
    }
    case 'defend': {
      if (state.phase !== 'defense') return { reason: 'Not defense phase' };
      if (player.id !== defender.id) return { reason: 'Only defender can defend' };
      if (!hasCard(player, command.card)) return { reason: 'Card not in hand' };
      const pair = state.table[command.attackIndex];
      if (!pair) return { reason: 'No such attack index' };
      if (pair.defense) return { reason: 'Attack already defended' };
      if (!canBeat(pair.attack, command.card, state.trump)) {
        return { reason: 'Defense card does not beat attack' };
      }
      return null;
    }
    case 'take': {
      if (state.phase !== 'defense') return { reason: 'Can only take during defense' };
      if (player.id !== defender.id) return { reason: 'Only defender can take' };
      return null;
    }
    case 'throwInPass': {
      if (state.phase !== 'attack' && state.phase !== 'defense') {
        return { reason: 'Cannot pass throw-in in this phase' };
      }
      if (!state.table.length) return { reason: 'No cards on table yet' };
      if (player.id === defender.id) return { reason: 'Defender cannot pass throw-in' };
      return null;
    }
    case 'endTurn': {
      if (player.id !== attacker.id) return { reason: 'Only attacker ends turn' };

      // Специальный случай: стартовая атака без карт на столе — пас хода.
      if (state.phase === 'attack' && state.table.length === 0 && !state.pendingTake) {
        return null;
      }

      if (state.phase !== 'defense' && state.phase !== 'cleanup') {
        return { reason: 'Cannot end turn now' };
      }
      if (state.table.some((p) => !p.defense) && !state.pendingTake) {
        return { reason: 'All attacks must be defended or defender must take' };
      }
      return null;
    }
  }
}

function hasCard(player: PlayerState, card: Card): boolean {
  return player.hand.some((c) => c.rank === card.rank && c.suit === card.suit);
}

function removeCard(hand: Card[], card: Card): Card[] {
  const idx = hand.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
  if (idx === -1) return hand;
  const next = hand.slice();
  next.splice(idx, 1);
  return next;
}

export function applyCommand(state: GameState, command: Command): GameState {
  const error = validateCommand(state, command);
  if (error) {
    throw new Error(error.reason);
  }

  const next: GameState = {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discard: [...state.discard],
    table: state.table.map((p) => ({ attack: { ...p.attack }, defense: p.defense ? { ...p.defense } : undefined })),
    stats: {
      ...state.stats,
      finishOrder: [...state.stats.finishOrder],
      perPlayer: state.stats.perPlayer.map((ps) => ({ ...ps })),
    },
    throwInPassedPlayerIds: [...(state.throwInPassedPlayerIds ?? [])],
  };

  const playerIndex = next.players.findIndex((p) => p.id === command.playerId);
  const player = next.players[playerIndex];
  const playerStats = next.stats.perPlayer.find((ps) => ps.playerId === command.playerId);
  if (playerStats) {
    playerStats.turnsMade += 1;
  }
  next.stats.totalTurns += 1;

  switch (command.type) {
    case 'attack': {
      player.hand = removeCard(player.hand, command.card);
      next.table.push({ attack: command.card });
      next.phase = 'defense';
       if (playerStats) playerStats.attacksMade += 1;
      return next;
    }
    case 'throwIn': {
      player.hand = removeCard(player.hand, command.card);
      next.table.push({ attack: command.card });
      if (playerStats) playerStats.throwInsMade += 1;
      return next;
    }
    case 'transfer': {
      // Minimal transfer logic for perevodnoy durak:
      // defender uses a matching-rank card to pass attack to next player.
      if (next.mode !== 'perevodnoy') {
        throw new Error('Transfer is only allowed in perevodnoy mode');
      }
      player.hand = removeCard(player.hand, command.card);
      next.table.push({ attack: command.card });
      // Pass defense to next player in order.
      const idx = nextDefenderIndexForTransfer(next);
      if (idx === null) {
        throw new Error('No player to transfer to');
      }
      next.attackerIndex = next.defenderIndex;
      next.defenderIndex = idx;
      next.phase = 'defense';
      if (playerStats) playerStats.transfersMade += 1;
      return next;
    }
    case 'defend': {
      player.hand = removeCard(player.hand, command.card);
      const pair = next.table[command.attackIndex];
      pair.defense = command.card;
      if (playerStats) playerStats.defensesMade += 1;
      // If all defended, we are ready for cleanup / attacker may end turn.
      if (next.table.every((p) => p.defense)) {
        next.phase = 'cleanup';
      }
      return next;
    }
    case 'take': {
      next.pendingTake = true;
      next.pendingTakePlayerId = player.id;
      // Defender will collect cards on table during endTurn.
      return next;
    }
    case 'endTurn': {
      return finishTurn(next);
    }
    case 'throwInPass': {
      if (!next.throwInPassedPlayerIds) {
        next.throwInPassedPlayerIds = [];
      }
      if (!next.throwInPassedPlayerIds.includes(player.id)) {
        next.throwInPassedPlayerIds.push(player.id);
      }
      return next;
    }
  }
}

function finishTurn(state: GameState): GameState {
  const next = state;
  const attacker = next.players[next.attackerIndex];
  const defender = next.players[next.defenderIndex];

  // one more completed round
  next.stats.totalRounds += 1;

  // compute cards on table for possible take
  const cardsOnTable =
    next.table?.reduce((sum, pair) => {
      let n = 1;
      if (pair.defense) n += 1;
      return sum + n;
    }, 0) ?? 0;

  if (next.pendingTake) {
    // Defender takes all cards.
    for (const pair of next.table) {
      defender.hand.push(pair.attack);
      if (pair.defense) defender.hand.push(pair.defense);
    }
    // update stats for taker
    next.stats.totalCardsTaken += cardsOnTable;
    if (next.pendingTakePlayerId) {
      const takerStats = next.stats.perPlayer.find((ps) => ps.playerId === next.pendingTakePlayerId);
      if (takerStats) {
        takerStats.cardsTaken += cardsOnTable;
      }
    }
  } else {
    // All cards go to discard.
    for (const pair of next.table) {
      next.discard.push(pair.attack);
      if (pair.defense) next.discard.push(pair.defense);
    }
  }

  // Clear table.
  next.table = [];
  next.pendingTake = false;
  next.pendingTakePlayerId = null;
  next.throwInPassedPlayerIds = [];

  // Draw up to 6 cards: attacker first, then others in order.
  const order: PlayerState[] = [];
  order.push(attacker);
  for (let i = 1; i < next.players.length; i++) {
    order.push(next.players[(next.attackerIndex + i) % next.players.length]);
  }
  for (const p of order) {
    while (p.hand.length < 6 && next.deck.length) {
      p.hand.push(next.deck.shift()!);
    }
  }

  // Mark players with 0 cards and empty deck as out.
  if (!next.deck.length) {
    for (const p of next.players) {
      if (p.hand.length === 0) {
        if (!p.isOut) {
          p.isOut = true;
          if (!next.stats.finishOrder.includes(p.id)) {
            next.stats.finishOrder.push(p.id);
            const place = next.stats.finishOrder.length;
            const ps = next.stats.perPlayer.find((s) => s.playerId === p.id);
            if (ps) ps.finishedPlace = place;
          }
        }
      }
    }
  }

  // Determine if game finished.
  const remaining = next.players.filter((p) => !p.isOut && p.hand.length > 0);
  if (!next.deck.length && remaining.length === 1) {
    next.finished = true;
    next.loserId = remaining[0].id;
    if (!next.stats.finishOrder.includes(remaining[0].id)) {
      next.stats.finishOrder.push(remaining[0].id);
      const place = next.stats.finishOrder.length;
      const ps = next.stats.perPlayer.find((s) => s.playerId === remaining[0].id);
      if (ps) ps.finishedPlace = place;
    }
  }

  // Next attacker/defender: if defender successfully defended (no take), defender becomes next attacker.
  if (!next.pendingTake) {
    next.attackerIndex = next.defenderIndex;
  } else {
    // Defender took: attacker stays, defender moves к следующему.
    // Find next active player.
    let idx = next.defenderIndex;
    let count = 0;
    do {
      idx = (idx + 1) % next.players.length;
      count++;
    } while (count <= next.players.length && next.players[idx].isOut);
    next.defenderIndex = idx;
  }

  // Ensure attacker/defender are different and point to active players.
  if (next.attackerIndex === next.defenderIndex) {
    next.defenderIndex = (next.attackerIndex + 1) % next.players.length;
  }

  next.phase = 'attack';
  return next;
}

