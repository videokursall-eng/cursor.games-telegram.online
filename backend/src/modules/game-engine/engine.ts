export type Suit = "S" | "H" | "D" | "C";
export type Rank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Phase = "idle" | "attack" | "defence" | "cleanup" | "finished";
export type GameMode = "classic" | "transferable";

export interface PlayerState {
  id: number;
  hand: Card[];
  isOut: boolean;
}

export interface TablePair {
  attack: Card;
  defence?: Card;
}

export interface GameState {
  players: PlayerState[];
  deck: Card[];
  discardPile: Card[];
  trumpSuit: Suit;
  trumpCard: Card;
  mode: GameMode;
  attackerIndex: number;
  defenderIndex: number;
  phase: Phase;
  table: TablePair[];
  maxTableCards: number;
  loserId?: number | null;
}

export type Command =
  | { type: "ATTACK"; playerId: number; cards: Card[] }
  | { type: "DEFEND"; playerId: number; defence: { attackIndex: number; card: Card } }
  | { type: "TAKE"; playerId: number }
  | { type: "PASS"; playerId: number }
  | { type: "CLEANUP"; playerId: number }
  | { type: "TRANSFER"; playerId: number; card: Card };

export interface GameEvent {
  type:
    | "GAME_STARTED"
    | "ATTACK_ADDED"
    | "CARD_DEFENDED"
    | "DEFENCE_SUCCESS"
    | "DEFENCE_FAILED_TAKE"
    | "ROUND_CLEANED"
    | "PLAYER_OUT"
    | "GAME_FINISHED";
  payload?: any;
}

const RANKS: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS: Suit[] = ["S", "H", "D", "C"];

export function createDeck36(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function shuffle(deck: Card[], seed: number): Card[] {
  const rand = lcg(seed);
  const copy = deck.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function createInitialState(
  playerIds: number[],
  seed: number,
  mode: GameMode = "classic",
): GameState {
  if (playerIds.length < 2 || playerIds.length > 6) {
    throw new Error("Invalid player count");
  }
  const deckShuffled = shuffle(createDeck36(), seed);
  const players: PlayerState[] = playerIds.map((id) => ({ id, hand: [], isOut: false }));
  const cardsPerPlayer = players.length === 6 ? 5 : 6;

  for (let r = 0; r < cardsPerPlayer; r += 1) {
    for (let p = 0; p < players.length; p += 1) {
      const card = deckShuffled.shift();
      if (!card) {
        throw new Error("Deck exhausted during initial deal");
      }
      players[p].hand.push(card);
    }
  }

  const trumpCard = deckShuffled[deckShuffled.length - 1];
  if (!trumpCard) {
    throw new Error("Missing trump card");
  }
  const trumpSuit = trumpCard.suit;

  let firstAttackerIndex = 0;
  let bestRankIdx = Number.POSITIVE_INFINITY;
  players.forEach((p) => {
    p.hand.forEach((card) => {
      if (card.suit === trumpSuit) {
        const ri = rankIndex(card.rank);
        if (ri < bestRankIdx) {
          bestRankIdx = ri;
          firstAttackerIndex = players.indexOf(p);
        }
      }
    });
  });

  const defenderIndex = (firstAttackerIndex + 1) % players.length;

  return {
    players,
    deck: deckShuffled,
    discardPile: [],
    trumpSuit,
    trumpCard,
    mode,
    attackerIndex: firstAttackerIndex,
    defenderIndex,
    phase: "attack",
    table: [],
    maxTableCards: 6,
    loserId: null,
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    deck: state.deck.slice(),
    discardPile: state.discardPile.slice(),
    table: state.table.map((t) => ({
      attack: { ...t.attack },
      defence: t.defence && { ...t.defence },
    })),
  };
}

function findPlayerIndex(state: GameState, playerId: number): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function isTrump(card: Card, state: GameState): boolean {
  return card.suit === state.trumpSuit;
}

function canBeat(attack: Card, defence: Card, state: GameState): boolean {
  if (isTrump(attack, state)) {
    if (!isTrump(defence, state)) return false;
    return rankIndex(defence.rank) > rankIndex(attack.rank);
  }
  if (isTrump(defence, state)) return true;
  if (attack.suit !== defence.suit) return false;
  return rankIndex(defence.rank) > rankIndex(attack.rank);
}

function allRanksOnTable(state: GameState): Rank[] {
  const ranks = new Set<Rank>();
  state.table.forEach((pair) => {
    ranks.add(pair.attack.rank);
    if (pair.defence) ranks.add(pair.defence.rank);
  });
  return Array.from(ranks);
}

function drawUpToSix(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  while (player.hand.length < 6 && state.deck.length > 0) {
    const card = state.deck.shift()!;
    player.hand.push(card);
  }
}

function nextAliveIndex(state: GameState, idx: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i += 1) {
    const j = (idx + i) % n;
    if (!state.players[j].isOut) return j;
  }
  return idx;
}

function checkLosers(state: GameState, events: GameEvent[]): void {
  if (state.loserId) return;
  const activePlayers = state.players.filter((p) => !p.isOut);
  activePlayers.forEach((p) => {
    if (p.hand.length === 0 && state.deck.length === 0) {
      p.isOut = true;
      events.push({ type: "PLAYER_OUT", payload: { playerId: p.id } });
    }
  });
  const stillIn = state.players.filter((p) => !p.isOut);
  if (stillIn.length === 1) {
    state.phase = "finished";
    state.loserId = stillIn[0].id;
    events.push({ type: "GAME_FINISHED", payload: { loserId: stillIn[0].id } });
  }
}

export function applyAction(state: GameState, command: Command): { state: GameState; events: GameEvent[] } {
  const s = cloneState(state);
  const events: GameEvent[] = [];

  if (s.phase === "finished") {
    throw new Error("Game already finished");
  }

  const actorIndex = findPlayerIndex(
    s,
    "playerId" in command ? command.playerId : -1,
  );
  if (actorIndex === -1) {
    throw new Error("Unknown player");
  }

  if (command.type === "ATTACK") {
    if (s.phase !== "attack" && s.phase !== "defence") throw new Error("Cannot attack in current phase");
    if (actorIndex !== s.attackerIndex) throw new Error("Only attacker may attack");
    if (command.cards.length === 0) throw new Error("No cards to attack");
    if (s.table.length >= s.maxTableCards) throw new Error("Table limit reached");

    const attacker = s.players[actorIndex];
    command.cards.forEach((card) => {
      const idx = attacker.hand.findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank,
      );
      if (idx === -1) throw new Error("Card not in hand");
    });

    const ranksOnTable = allRanksOnTable(s);
    if (s.table.length > 0) {
      command.cards.forEach((c) => {
        if (!ranksOnTable.includes(c.rank)) {
          throw new Error("Attack card rank not on table");
        }
      });
    }

    const defender = s.players[s.defenderIndex];
    if (s.table.length + command.cards.length > s.maxTableCards) {
      throw new Error("Too many cards on table");
    }
    if (s.table.length + command.cards.length > defender.hand.length) {
      throw new Error("Defender has not enough cards to cover attack");
    }

    command.cards.forEach((card) => {
      const idx = attacker.hand.findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank,
      );
      attacker.hand.splice(idx, 1);
      s.table.push({ attack: card });
      events.push({ type: "ATTACK_ADDED", payload: { playerId: attacker.id, card } });
    });

    s.phase = "defence";
  } else if (command.type === "DEFEND") {
    if (s.phase !== "defence") throw new Error("Not in defence phase");
    if (actorIndex !== s.defenderIndex) throw new Error("Only defender may defend");

    const pair = s.table[command.defence.attackIndex];
    if (!pair) throw new Error("Invalid attack index");
    if (pair.defence) throw new Error("Card already defended");

    const defender = s.players[actorIndex];
    const cardIdx = defender.hand.findIndex(
      (c) =>
        c.suit === command.defence.card.suit &&
        c.rank === command.defence.card.rank,
    );
    if (cardIdx === -1) throw new Error("Defence card not in hand");

    if (!canBeat(pair.attack, command.defence.card, s)) {
      throw new Error("Defence card cannot beat attack");
    }

    defender.hand.splice(cardIdx, 1);
    pair.defence = command.defence.card;
    events.push({
      type: "CARD_DEFENDED",
      payload: { playerId: defender.id, attackIndex: command.defence.attackIndex },
    });

    const allBeaten = s.table.every((p) => p.defence);
    if (allBeaten) {
      s.phase = "cleanup";
      events.push({ type: "DEFENCE_SUCCESS" });
    }
  } else if (command.type === "TAKE") {
    if (s.phase !== "defence") throw new Error("Cannot take now");
    if (actorIndex !== s.defenderIndex) throw new Error("Only defender may take");
    const defender = s.players[actorIndex];
    s.table.forEach((p) => {
      defender.hand.push(p.attack);
      if (p.defence) defender.hand.push(p.defence);
    });
    s.table = [];
    events.push({ type: "DEFENCE_FAILED_TAKE", payload: { playerId: defender.id } });

    const n = s.players.length;
    const newAttacker = nextAliveIndex(s, s.defenderIndex);
    s.attackerIndex = newAttacker;
    s.defenderIndex = nextAliveIndex(s, newAttacker);

    for (let i = 0; i < n; i += 1) {
      const idx = (s.attackerIndex + i) % n;
      if (!s.players[idx].isOut) drawUpToSix(s, idx);
    }

    s.phase = "attack";
    checkLosers(s, events);
  } else if (command.type === "CLEANUP") {
    if (s.phase !== "cleanup") throw new Error("Not in cleanup phase");
    const attacker = s.players[s.attackerIndex];
    if (attacker.id !== command.playerId) throw new Error("Only attacker may cleanup");

    s.table.forEach((p) => {
      s.discardPile.push(p.attack);
      if (p.defence) s.discardPile.push(p.defence);
    });
    s.table = [];
    events.push({ type: "ROUND_CLEANED" });

    const n = s.players.length;
    for (let i = 0; i < n; i += 1) {
      const idx = (s.attackerIndex + i) % n;
      if (!s.players[idx].isOut) drawUpToSix(s, idx);
    }

    s.attackerIndex = nextAliveIndex(s, s.attackerIndex);
    s.defenderIndex = nextAliveIndex(s, s.attackerIndex);

    s.phase = "attack";
    checkLosers(s, events);
  } else if (command.type === "PASS") {
    if (s.phase !== "attack") throw new Error("Cannot pass now");
    if (actorIndex !== s.attackerIndex) throw new Error("Only attacker may pass");
    if (s.table.length === 0) throw new Error("Cannot pass with empty table");
    s.phase = "defence";
  } else if (command.type === "TRANSFER") {
    if (s.mode !== "transferable") throw new Error("Transfer not allowed in classic mode");
    if (s.phase !== "defence") throw new Error("Transfer only allowed in defence phase");
    if (actorIndex !== s.defenderIndex) throw new Error("Only defender may transfer");
    if (s.table.length === 0) throw new Error("Nothing to transfer");

    const defender = s.players[actorIndex];
    const cardIdx = defender.hand.findIndex(
      (c) => c.suit === command.card.suit && c.rank === command.card.rank,
    );
    if (cardIdx === -1) throw new Error("Transfer card not in hand");

    const ranksOnTable = allRanksOnTable(s);
    if (!ranksOnTable.includes(command.card.rank)) {
      throw new Error("Transfer card rank not on table");
    }

    const nextDefenderIndex = nextAliveIndex(s, s.defenderIndex);
    const nextDefender = s.players[nextDefenderIndex];
    const totalAttacksAfter = s.table.length + 1;
    if (totalAttacksAfter > s.maxTableCards) {
      throw new Error("Transfer exceeds table limit");
    }
    if (totalAttacksAfter > nextDefender.hand.length) {
      throw new Error("Next defender has not enough cards to accept transfer");
    }

    defender.hand.splice(cardIdx, 1);
    s.table.push({ attack: command.card });
    s.defenderIndex = nextDefenderIndex;
  }

  return { state: s, events };
}

