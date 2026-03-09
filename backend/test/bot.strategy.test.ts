import { describe, it, expect } from "@jest/globals";
import { createInitialState, applyAction, GameState } from "../src/modules/game-engine/engine";
import { decideBotMove } from "../src/modules/bot/bot.strategy";

describe("bot strategy basic legality", () => {
  it("never plays cards not in its hand", () => {
    const base: GameState = createInitialState([1, 2], 42, "classic");
    const attacker = base.players[base.attackerIndex];

    const decision = decideBotMove("medium", base, attacker.id);
    if (!decision.command) return;
    if (decision.command.type === "ATTACK") {
      decision.command.cards.forEach((card) => {
        expect(
          attacker.hand.some((c) => c.suit === card.suit && c.rank === card.rank),
        ).toBe(true);
      });
    }
  });

  it("produces transferable commands only in transferable mode", () => {
    const classicState: GameState = createInitialState([1, 2, 3], 7, "classic");
    const transferState: GameState = createInitialState([1, 2, 3], 7, "transferable");

    classicState.players[0].hand = transferState.players[0].hand.slice();

    const d1 = decideBotMove("hard", classicState, classicState.players[0].id);
    const d2 = decideBotMove("hard", transferState, transferState.players[0].id);

    if (d1.command && d1.command.type === "TRANSFER") {
      throw new Error("TRANSFER not allowed in classic mode");
    }
    if (d2.command && d2.command.type === "TRANSFER") {
      expect(transferState.mode).toBe("transferable");
    }
  });

  it("bot command can be applied without throwing", () => {
    const base: GameState = createInitialState([1, 2], 9, "classic");
    const attacker = base.players[base.attackerIndex];

    const decision = decideBotMove("easy", base, attacker.id);
    if (!decision.command) return;

    expect(() => applyAction(base, decision.command!)).not.toThrow();
  });
});

