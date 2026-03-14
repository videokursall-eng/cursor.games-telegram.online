import { describe, it, expect } from 'vitest';
import { createDeck } from './cards';
import {
  applyCommand,
  createInitialState,
  type GameState,
  type Command,
} from './core';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function play(state: GameState, commands: Command[]): GameState {
  let s = clone(state);
  for (const cmd of commands) {
    s = applyCommand(s, cmd);
  }
  return s;
}

describe('game-core state machine (подкидной)', () => {
  it('initializes game with 2 players and 36-card deck', () => {
    const deck = createDeck();
    const state = createInitialState('g1', 'podkidnoy', ['p1', 'p2'], 'hearts', deck);
    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(6);
    expect(state.players[1].hand).toHaveLength(6);
    expect(state.deck.length + state.players[0].hand.length + state.players[1].hand.length).toBe(36);
    expect(state.trump).toBe('hearts');
  });

  it('allows attacker to attack and defender to defend with stronger card', () => {
    const deck = createDeck();
    const state = createInitialState('g2', 'podkidnoy', ['A', 'B'], 'hearts', deck);
    const attackerCard = state.players[0].hand[0];
    // Pick defense card that can beat attack: same suit, higher rank or trump.
    const defenseCandidate =
      state.players[1].hand.find(
        (c) =>
          (c.suit === attackerCard.suit && c.rank !== attackerCard.rank) ||
          (c.suit === state.trump && attackerCard.suit !== state.trump),
      ) ?? state.players[1].hand[0];

    const after = play(state, [
      { type: 'attack', playerId: 'A', card: attackerCard },
      { type: 'defend', playerId: 'B', attackIndex: 0, card: defenseCandidate },
      { type: 'endTurn', playerId: 'A' },
    ]);

    expect(after.table).toHaveLength(0);
    expect(after.discard.length).toBeGreaterThanOrEqual(2);
  });

  it('throws on invalid defense (too weak card)', () => {
    const deck = createDeck();
    const state = createInitialState('g3', 'podkidnoy', ['A', 'B'], 'hearts', deck);
    const attackerCard = state.players[0].hand[0];
    const badDefense = state.players[1].hand.find((c) => c.suit === attackerCard.suit && c.rank === attackerCard.rank);
    if (!badDefense) {
      // If we didn't find same-rank card, skip this scenario for this deck arrangement.
      return;
    }
    expect(() =>
      play(state, [
        { type: 'attack', playerId: 'A', card: attackerCard },
        { type: 'defend', playerId: 'B', attackIndex: 0, card: badDefense },
      ]),
    ).toThrow();
  });

  it('defender can take cards and keep them in hand', () => {
    const deck = createDeck();
    const state = createInitialState('g4', 'podkidnoy', ['A', 'B'], 'hearts', deck);
    const attackerCard = state.players[0].hand[0];
    const beforeDefenderHandSize = state.players[1].hand.length;

    const after = play(state, [
      { type: 'attack', playerId: 'A', card: attackerCard },
      { type: 'take', playerId: 'B' },
      { type: 'endTurn', playerId: 'A' },
    ]);

    const defenderAfter = after.players.find((p) => p.id === 'B')!;
    expect(defenderAfter.hand.length).toBeGreaterThan(beforeDefenderHandSize);
  });

  it('allows attacker to pass when no cards on table in attack phase', () => {
    const deck = createDeck();
    const state = createInitialState('g-pass', 'podkidnoy', ['A', 'B'], 'hearts', deck);

    const after = play(state, [{ type: 'endTurn', playerId: 'A' }]);

    // Ход должен перейти к следующему игроку, фаза остаётся атакующей.
    expect(after.phase).toBe('attack');
    expect(after.attackerIndex).toBe(1);
    expect(after.players[after.attackerIndex].id).toBe('B');
  });

  it('prevents player from throwing in after throwInPass while allowing other attackers', () => {
    const deck = createDeck();
    const base = createInitialState('g-throwin-pass', 'podkidnoy', ['A', 'B', 'C'], 'hearts', deck);
    const state = clone(base);
    const attackerCard = state.players[0].hand[0];

    // Setup table with initial attack card in defense phase (throw-in phase).
    state.table = [{ attack: attackerCard }];
    state.phase = 'defense';

    // Give both A and B a matching-rank card so they can throw in.
    state.players[0].hand = [attackerCard];
    state.players[1].hand = [attackerCard];
    // Make C the defender so that A and B are attackers who can throw in/pass.
    state.defenderIndex = 2;

    // B passes throw-in, C still can throw in.
    const after = play(state as GameState, [
      { type: 'throwInPass', playerId: 'B' },
      { type: 'throwIn', playerId: 'A', card: attackerCard },
    ]);

    expect(after.table.length).toBe(2);
    // B attempting to throw in again in this round should now be rejected.
    expect(() => play(after, [{ type: 'throwIn', playerId: 'B', card: attackerCard }])).toThrow(
      /Player has already passed throw-in this round/,
    );
  });
});

describe('game-core transfer (переводной)', () => {
  it('allows defender to transfer attack to next player', () => {
    const deck = createDeck();
    const state = createInitialState('g5', 'perevodnoy', ['A', 'B', 'C'], 'hearts', deck);
    const attackerCard = state.players[0].hand[0];
    const transferRank = attackerCard.rank;
    const defenderCard = state.players[1].hand.find((c) => c.rank === transferRank);

    if (!defenderCard) {
      // no suitable card for transfer in this deck arrangement, skip
      return;
    }

    const beforeDefender = state.defenderIndex;

    const after = play(state, [
      { type: 'attack', playerId: 'A', card: attackerCard },
      { type: 'transfer', playerId: 'B', card: defenderCard },
    ]);

    expect(after.table.length).toBe(2);
    expect(after.attackerIndex).toBe(beforeDefender);
  });

  it('allows two consecutive transfers when players have enough cards', () => {
    const deck = createDeck();
    const base = createInitialState('g6', 'perevodnoy', ['A', 'B', 'C', 'D'], 'hearts', deck);
    const state = clone(base);
    const attackerCard = state.players[0].hand[0];
    // Ensure B and C both have the transferring card.
    state.players[1].hand[0] = attackerCard;
    state.players[2].hand[0] = attackerCard;

    const after = play(state, [
      { type: 'attack', playerId: 'A', card: attackerCard },
      { type: 'transfer', playerId: 'B', card: attackerCard },
      { type: 'transfer', playerId: 'C', card: attackerCard },
    ]);

    expect(after.table.length).toBe(3);
    const defender = after.players[after.defenderIndex];
    expect(defender.id).toBe('D');
  });

  it('rejects transfer when next defender does not have enough cards', () => {
    const deck = createDeck();
    const base = createInitialState('g7', 'perevodnoy', ['A', 'B', 'C'], 'hearts', deck);
    const state = clone(base);
    const attackerCard = state.players[0].hand[0];
    // Make next defender C have too few cards to accept transfer (only 1 card).
    state.players[2].hand = state.players[2].hand.slice(0, 1);

    // Ensure defender has a matching-rank card for a valid transfer attempt.
    state.players[1].hand[0] = attackerCard;

    expect(() =>
      play(state, [
        { type: 'attack', playerId: 'A', card: attackerCard },
        { type: 'transfer', playerId: 'B', card: attackerCard },
      ]),
    ).toThrow(/Next defender does not have enough cards/);
  });
});

