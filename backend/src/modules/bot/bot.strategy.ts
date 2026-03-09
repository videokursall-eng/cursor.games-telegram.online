import type { Card, Command, GameState } from "../game-engine/engine";
import type { BotContext, BotDecision, BotLevel } from "./bot.types";

function cardValue(card: Card, trumpSuit: Card["suit"]): number {
  const rankOrder: Card["rank"][] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const base = rankOrder.indexOf(card.rank);
  return base + (card.suit === trumpSuit ? 100 : 0);
}

function buildContext(state: GameState, playerId: number): BotContext {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) throw new Error("Bot player not found");

  const defender = state.players[state.defenderIndex];
  const nextDefender = state.players[(state.defenderIndex + 1) % state.players.length];

  return {
    playerId,
    mode: state.mode,
    visibleHand: me.hand.slice(),
    table: state.table.map((t) => ({ attack: t.attack, defence: t.defence })),
    trumpSuit: state.trumpSuit,
    maxTableCards: state.maxTableCards,
    defenderHandSize: defender.hand.length,
    nextDefenderHandSize: nextDefender.id === playerId ? undefined : nextDefender.hand.length,
  };
}

function chooseAttack(ctx: BotContext, level: BotLevel): Command | null {
  if (ctx.visibleHand.length === 0) return null;

  const sorted = ctx.visibleHand.slice().sort((a, b) => cardValue(a, ctx.trumpSuit) - cardValue(b, ctx.trumpSuit));
  const lowest = sorted[0];

  if (ctx.table.length === 0) {
    return { type: "ATTACK", playerId: ctx.playerId, cards: [lowest] };
  }

  const allowedRanks = new Set(ctx.table.flatMap((p) => [p.attack.rank, p.defence?.rank].filter(Boolean) as Card["rank"][]));
  const candidates = sorted.filter((c) => allowedRanks.has(c.rank));
  if (candidates.length === 0) return null;

  if (level === "easy") {
    return { type: "ATTACK", playerId: ctx.playerId, cards: [candidates[0]] };
  }

  const nonTrump = candidates.filter((c) => c.suit !== ctx.trumpSuit);
  const pick = (nonTrump[0] ?? candidates[0])!;

  if (ctx.table.length + 1 > ctx.defenderHandSize) return null;

  return { type: "ATTACK", playerId: ctx.playerId, cards: [pick] };
}

function chooseDefence(ctx: BotContext, level: BotLevel): Command | null {
  if (ctx.table.length === 0) return null;
  const openIndex = ctx.table.findIndex((p) => !p.defence);
  if (openIndex === -1) return null;
  const target = ctx.table[openIndex].attack;

  const canBeat = ctx.visibleHand.filter((c) => {
    if (c.suit === target.suit && cardValue(c, ctx.trumpSuit) > cardValue(target, ctx.trumpSuit)) return true;
    if (c.suit === ctx.trumpSuit && target.suit !== ctx.trumpSuit) return true;
    return false;
  });

  if (canBeat.length === 0) {
    if (level === "easy") {
      return { type: "TAKE", playerId: ctx.playerId };
    }
    if (ctx.visibleHand.length <= ctx.defenderHandSize) {
      return { type: "TAKE", playerId: ctx.playerId };
    }
    return { type: "TAKE", playerId: ctx.playerId };
  }

  const sorted = canBeat.slice().sort((a, b) => cardValue(a, ctx.trumpSuit) - cardValue(b, ctx.trumpSuit));
  const pick = sorted[0]!;

  return {
    type: "DEFEND",
    playerId: ctx.playerId,
    defence: { attackIndex: openIndex, card: pick },
  };
}

function chooseTransfer(ctx: BotContext, level: BotLevel): Command | null {
  if (ctx.mode !== "transferable") return null;
  if (ctx.table.length === 0) return null;
  if (ctx.nextDefenderHandSize == null) return null;
  if (level === "easy") return null;

  const ranksOnTable = new Set(ctx.table.map((p) => p.attack.rank));
  const candidates = ctx.visibleHand.filter((c) => ranksOnTable.has(c.rank));
  if (candidates.length === 0) return null;

  const totalAfter = ctx.table.length + 1;
  if (totalAfter > ctx.maxTableCards) return null;
  if (totalAfter > ctx.nextDefenderHandSize) return null;

  const nonTrump = candidates.filter((c) => c.suit !== ctx.trumpSuit);
  const pick = (nonTrump[0] ?? candidates[0])!;

  return { type: "TRANSFER", playerId: ctx.playerId, card: pick };
}

export function decideBotMove(level: BotLevel, state: GameState, playerId: number): BotDecision {
  const ctx = buildContext(state, playerId);

  if (state.phase === "attack" && state.players[state.attackerIndex].id === playerId) {
    const attack = chooseAttack(ctx, level);
    return { command: attack };
  }

  if (state.phase === "defence" && state.players[state.defenderIndex].id === playerId) {
    if (ctx.mode === "transferable" && level !== "easy") {
      const transfer = chooseTransfer(ctx, level);
      if (transfer) return { command: transfer };
    }
    const defence = chooseDefence(ctx, level);
    return { command: defence };
  }

  return { command: null };
}

