import { pgPool } from "../../infrastructure/db";
import type { GameState, Card, Command } from "../game-engine/engine";
import { applyAction } from "../game-engine/engine";
import { decideBotMove } from "../bot/bot.strategy";
import type { BotLevel } from "../bot/bot.types";
import { logger } from "../../shared/logger";

const BOT_LEVEL: BotLevel = "medium";

export interface MatchSnapshot {
  matchId: string;
  variant: "classic" | "transferable";
  status: string;
  stateVersion: number;
  trumpSuit: "S" | "H" | "D" | "C";
  trumpCard: string;
  players: {
    userId: number | null;
    seatIndex: number;
    isBot: boolean;
    status: string;
    cardsInHand: number;
    cardsTaken: number;
    isWinner: boolean;
    hand?: Card[];
  }[];
  turn: {
    turnNumber: number;
    attackerIndex: number;
    defenderIndex: number;
    phase: string;
    table: { attack: Card; defence?: Card }[];
    expiresAt: string | null;
  };
  deck: {
    remainingCount: number;
    discardCount: number;
    trumpCard: string;
  };
}

function cardToStr(c: Card): string {
  return c.suit + c.rank;
}

function parseGameState(raw: unknown): GameState {
  const o = raw as Record<string, unknown>;
  const playersRaw = Array.isArray(o.players) ? o.players : [];
  const deckRaw = Array.isArray(o.deck) ? o.deck : [];
  const discardRaw = Array.isArray(o.discardPile) ? o.discardPile : [];
  const tableRaw = Array.isArray(o.table) ? o.table : [];
  return {
    players: playersRaw.map((p: any) => ({
      id: p.id,
      hand: (p.hand || []).map((c: any) => ({ suit: c.suit, rank: c.rank })),
      isOut: !!p.isOut,
    })),
    deck: deckRaw.map((c: any) => ({ suit: c.suit, rank: c.rank })),
    discardPile: discardRaw.map((c: any) => ({ suit: c.suit, rank: c.rank })),
    trumpSuit: o.trumpSuit as "S" | "H" | "D" | "C",
    trumpCard: o.trumpCard as Card,
    mode: (o.mode as "classic" | "transferable") || "classic",
    attackerIndex: Number(o.attackerIndex) || 0,
    defenderIndex: Number(o.defenderIndex) || 0,
    phase: (o.phase as GameState["phase"]) || "idle",
    table: tableRaw.map((p: any) => ({
      attack: p.attack as Card,
      defence: p.defence as Card | undefined,
    })),
    maxTableCards: Number(o.maxTableCards) || 6,
    loserId: o.loserId != null ? Number(o.loserId) : null,
  };
}

export async function getMatchState(matchId: string, forUserId: number | null): Promise<MatchSnapshot | null> {
  const client = await pgPool.connect();
  try {
    const matchRes = await client.query(
      "SELECT id, variant, status, state_version, last_state, trump_suit FROM matches WHERE id = $1",
      [matchId],
    );
    if (matchRes.rowCount === 0) return null;
    const row = matchRes.rows[0] as {
      id: string;
      variant: string;
      status: string;
      state_version: number;
      last_state: unknown;
      trump_suit: string;
    };
    const state = parseGameState(row.last_state);
    const playersRes = await client.query(
      "SELECT user_id, seat_index, is_bot, status, cards_in_hand, cards_taken, is_winner FROM match_players WHERE match_id = $1 ORDER BY seat_index",
      [matchId],
    );
    const seatToPlayer = playersRes.rows as { user_id: number | null; seat_index: number; is_bot: boolean; status: string; cards_in_hand: number; cards_taken: number; is_winner: boolean }[];

    const players = state.players.map((p, i) => {
      const db = seatToPlayer[i];
      const hand = db && forUserId !== null && db.user_id === forUserId ? p.hand : undefined;
      return {
        userId: db?.user_id ?? null,
        seatIndex: i,
        isBot: db?.is_bot ?? false,
        status: db?.status ?? "active",
        cardsInHand: p.hand.length,
        cardsTaken: 0,
        isWinner: db?.is_winner ?? false,
        hand,
      };
    });

    const trumpCard = state.trumpCard ? cardToStr(state.trumpCard) : state.trumpSuit + "?";

    return {
      matchId: row.id,
      variant: row.variant as "classic" | "transferable",
      status: row.status,
      stateVersion: row.state_version,
      trumpSuit: row.trump_suit as "S" | "H" | "D" | "C",
      trumpCard,
      players,
      turn: {
        turnNumber: 0,
        attackerIndex: state.attackerIndex,
        defenderIndex: state.defenderIndex,
        phase: state.phase,
        table: state.table.map((t) => ({ attack: t.attack, defence: t.defence })),
        expiresAt: null,
      },
      deck: {
        remainingCount: state.deck.length,
        discardCount: state.discardPile.length,
        trumpCard,
      },
    };
  } finally {
    client.release();
  }
}

function buildCommand(type: string, payload: any, playerId: number): Command | null {
  if (type === "ATTACK" && Array.isArray(payload?.cards)) {
    return { type: "ATTACK", playerId, cards: payload.cards };
  }
  if (type === "DEFEND" && payload?.attackIndex != null && payload?.card) {
    return { type: "DEFEND", playerId, defence: { attackIndex: payload.attackIndex, card: payload.card } };
  }
  if (type === "TAKE") {
    return { type: "TAKE", playerId };
  }
  if (type === "PASS") {
    return { type: "PASS", playerId };
  }
  if (type === "CLEANUP") {
    return { type: "CLEANUP", playerId };
  }
  if (type === "TRANSFER" && payload?.card) {
    return { type: "TRANSFER", playerId, card: payload.card };
  }
  return null;
}

export async function applyMatchCommand(
  matchId: string,
  userId: number,
  type: string,
  payload: unknown,
): Promise<{ ok: boolean; error?: string; snapshot?: MatchSnapshot }> {
  const client = await pgPool.connect();
  try {
    const matchRes = await client.query(
      "SELECT id, variant, status, state_version, last_state FROM matches WHERE id = $1",
      [matchId],
    );
    if (matchRes.rowCount === 0) {
      return { ok: false, error: "MATCH_NOT_FOUND" };
    }
    const row = matchRes.rows[0] as { id: string; variant: string; status: string; state_version: number; last_state: unknown };
    if (row.status !== "in_progress") {
      return { ok: false, error: "MATCH_NOT_STARTED" };
    }
    const state = parseGameState(row.last_state);
    const playerIndex = state.players.findIndex((p) => p.id === userId);
    if (playerIndex === -1) {
      return { ok: false, error: "NOT_PLAYER" };
    }
    const command = buildCommand(type, payload, userId);
    if (!command) {
      return { ok: false, error: "INVALID_COMMAND" };
    }
    let nextState: GameState;
    try {
      const result = applyAction(state, command);
      nextState = result.state;
    } catch (e) {
      logger.warn("Engine applyAction failed", { matchId, userId, type, err: e });
      return { ok: false, error: "INVALID_MOVE" };
    }
    nextState = await runBotsUntilHumanTurn(matchId, nextState);
    const lastStateJson = JSON.stringify(nextState);
    const newStatus = nextState.phase === "finished" ? "finished" : "in_progress";
    await client.query(
      "UPDATE matches SET last_state = $1::jsonb, state_version = state_version + 1, status = $2, updated_at = now(), finished_at = CASE WHEN $2 = 'finished' THEN now() ELSE finished_at END WHERE id = $3",
      [lastStateJson, newStatus, matchId],
    );
    for (let i = 0; i < nextState.players.length; i++) {
      await client.query(
        "UPDATE match_players SET cards_in_hand = $1, is_winner = $2 WHERE match_id = $3 AND seat_index = $4",
        [
          nextState.players[i]!.hand.length,
          nextState.loserId != null ? nextState.players[i]!.id !== nextState.loserId : false,
          matchId,
          i,
        ],
      );
    }
    const snapshot = await getMatchState(matchId, userId);
    return { ok: true, snapshot: snapshot ?? undefined };
  } finally {
    client.release();
  }
}

async function runBotsUntilHumanTurn(matchId: string, state: GameState): Promise<GameState> {
  let s = state;
  for (;;) {
    if (s.phase === "finished") return s;
    const currentPlayerId = s.phase === "cleanup" ? s.players[s.attackerIndex]?.id : (s.phase === "defence" ? s.players[s.defenderIndex]?.id : s.players[s.attackerIndex]?.id);
    if (currentPlayerId == null) return s;
    const isBot = currentPlayerId < 0;
    if (!isBot) return s;
    if (s.phase === "cleanup") {
      const cleanupPlayer = s.players[s.attackerIndex];
      if (cleanupPlayer) {
        const result = applyAction(s, { type: "CLEANUP", playerId: cleanupPlayer.id });
        s = result.state;
        continue;
      }
    }
    const decision = decideBotMove(BOT_LEVEL, s, currentPlayerId);
    if (!decision.command) return s;
    try {
      const result = applyAction(s, decision.command);
      s = result.state;
    } catch (e) {
      logger.warn("Bot move apply failed", { matchId, playerId: currentPlayerId, err: e });
      return s;
    }
  }
}
