import { describe, it, expect } from "@jest/globals";
import { Card, GameState, applyAction, createInitialState } from "../src/modules/game-engine/engine";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

describe("transferable durak rules", () => {
  it("allows successful transfer with same rank to next player", () => {
    const base: GameState = createInitialState([1, 2, 3], 5, "transferable");
    base.trumpSuit = "H";
    base.trumpCard = card("H", "6");

    base.players[0].hand = [card("S", "9")];
    base.players[1].hand = [card("D", "9"), card("C", "7")];
    base.players[2].hand = [card("C", "10"), card("D", "Q"), card("S", "K")];

    base.attackerIndex = 0;
    base.defenderIndex = 1;
    base.table = [];
    base.phase = "attack";

    const afterAttack = applyAction(base, {
      type: "ATTACK",
      playerId: 1,
      cards: [card("S", "9")],
    }).state;

    const { state } = applyAction(afterAttack, {
      type: "TRANSFER",
      playerId: 2,
      card: card("D", "9"),
    });

    expect(state.defenderIndex).toBe(2);
    expect(state.table.map((p) => p.attack)).toEqual([card("S", "9"), card("D", "9")]);
  });

  it("forbids transfer in classic mode", () => {
    const base: GameState = createInitialState([1, 2, 3], 6, "classic");
    base.players[0].hand = [card("S", "9")];
    base.players[1].hand = [card("D", "9")];
    base.attackerIndex = 0;
    base.defenderIndex = 1;
    base.table = [];
    base.phase = "attack";

    const afterAttack = applyAction(base, {
      type: "ATTACK",
      playerId: 1,
      cards: [card("S", "9")],
    }).state;

    expect(() =>
      applyAction(afterAttack, {
        type: "TRANSFER",
        playerId: 2,
        card: card("D", "9"),
      }),
    ).toThrow("Transfer not allowed in classic mode");
  });
});

