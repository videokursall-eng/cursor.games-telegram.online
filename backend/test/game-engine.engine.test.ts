import { describe, it, expect } from "@jest/globals";
import { createDeck36, createInitialState, applyAction, GameState, Card } from "../src/modules/game-engine/engine";

describe("game engine deck", () => {
  it("creates 36 unique cards", () => {
    const deck = createDeck36();
    expect(deck).toHaveLength(36);
    const keys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(36);
  });
});

describe("initial state and first attacker", () => {
  it("deals 6 cards to each player and sets trump", () => {
    const state = createInitialState([1, 2], 123, "classic");
    expect(state.players[0].hand).toHaveLength(6);
    expect(state.players[1].hand).toHaveLength(6);
    expect(state.trumpCard.suit).toBe(state.trumpSuit);
    expect(state.deck.length).toBe(36 - 12);
  });

  it("has valid attacker/defender indices", () => {
    const state = createInitialState([10, 20, 30], 999, "classic");
    expect(state.attackerIndex).toBeGreaterThanOrEqual(0);
    expect(state.attackerIndex).toBeLessThan(state.players.length);
    expect(state.defenderIndex).toBeGreaterThanOrEqual(0);
    expect(state.defenderIndex).toBeLessThan(state.players.length);
    expect(state.attackerIndex).not.toBe(state.defenderIndex);
  });

  it("supports 5 and 6 players", () => {
    const state5 = createInitialState([1, 2, 3, 4, 5], 42, "classic");
    expect(state5.players).toHaveLength(5);
    expect(state5.players.every((p) => p.hand.length === 6)).toBe(true);
    expect(state5.deck.length).toBe(36 - 5 * 6);

    const state6 = createInitialState([1, 2, 3, 4, 5, 6], 43, "transferable");
    expect(state6.players).toHaveLength(6);
    expect(state6.players.every((p) => p.hand.length === 5)).toBe(true);
    expect(state6.deck.length).toBe(6);
    expect(state6.trumpCard).toBeDefined();
  });
});

describe("attack / defence rules", () => {
  function makeCard(suit: Card["suit"], rank: Card["rank"]): Card {
    return { suit, rank };
  }

  it("allows first attack with any card from attacker hand", () => {
    const base = createInitialState([1, 2], 1, "classic");
    const attacker = base.players[base.attackerIndex];
    const card = attacker.hand[0];
    const { state } = applyAction(base, {
      type: "ATTACK",
      playerId: attacker.id,
      cards: [card],
    });
    expect(state.table).toHaveLength(1);
    expect(state.table[0].attack).toEqual(card);
  });

  it("forbids attack with rank not on table after first", () => {
    const base = createInitialState([1, 2], 2, "classic");
    const attacker = base.players[base.attackerIndex];
    const first = attacker.hand[0];
    const next =
      attacker.hand.find((c: Card) => c.rank !== first.rank) || attacker.hand[1];
    const afterFirst = applyAction(base, {
      type: "ATTACK",
      playerId: attacker.id,
      cards: [first],
    }).state;
    expect(() =>
      applyAction(afterFirst, {
        type: "ATTACK",
        playerId: attacker.id,
        cards: [next],
      }),
    ).toThrow("Attack card rank not on table");
  });

  it("allows defence with higher same-suit card", () => {
    const base: GameState = createInitialState([1, 2], 3, "classic");
    const attacker = base.players[base.attackerIndex];
    const defender = base.players[base.defenderIndex];
    const nonTrump =
      attacker.hand.find((c: Card) => c.suit !== base.trumpSuit) ||
      attacker.hand[0];
    attacker.hand = [nonTrump];
    const higher = makeCard(nonTrump.suit, "A");
    defender.hand = [higher];

    const afterAttack = applyAction(base, {
      type: "ATTACK",
      playerId: attacker.id,
      cards: [nonTrump],
    }).state;

    const { state } = applyAction(afterAttack, {
      type: "DEFEND",
      playerId: defender.id,
      defence: { attackIndex: 0, card: higher },
    });
    expect(state.table[0].defence).toEqual(higher);
  });

  it("forbids defence with weaker or wrong-suit card", () => {
    const base: GameState = createInitialState([1, 2], 4, "classic");
    const attacker = base.players[base.attackerIndex];
    const defender = base.players[base.defenderIndex];
    const nonTrump = makeCard("S", "9");
    attacker.hand = [nonTrump];
    defender.hand = [makeCard("S", "7"), makeCard("H", "A")];

    const afterAttack = applyAction(base, {
      type: "ATTACK",
      playerId: attacker.id,
      cards: [nonTrump],
    }).state;

    expect(() =>
      applyAction(afterAttack, {
        type: "DEFEND",
        playerId: defender.id,
        defence: { attackIndex: 0, card: makeCard("S", "7") },
      }),
    ).toThrow();
    expect(() =>
      applyAction(afterAttack, {
        type: "DEFEND",
        playerId: defender.id,
        defence: { attackIndex: 0, card: makeCard("H", "A") },
      }),
    ).toThrow();
  });
});

