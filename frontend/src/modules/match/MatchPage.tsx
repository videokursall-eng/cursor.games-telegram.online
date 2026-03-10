import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../shared/authContext";
import { useRealtimeSocket } from "../../shared/realtimeClient";

type Suit = "S" | "H" | "D" | "C";
interface Card {
  suit: Suit;
  rank: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLORS: Record<Suit, string> = { S: "#e2e8f0", H: "#f87171", D: "#f87171", C: "#e2e8f0" };

function cardKey(c: Card): string {
  return c.suit + c.rank;
}

interface MatchSnapshot {
  matchId: string;
  variant: string;
  status: string;
  stateVersion: number;
  trumpSuit: Suit;
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

export const MatchPage: React.FC = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const socket = useRealtimeSocket();
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const myUserId = user?.id ?? null;
  const mySeatIndex = snapshot?.players.findIndex((p) => p.userId === myUserId) ?? -1;
  const myHand = mySeatIndex >= 0 ? (snapshot?.players[mySeatIndex]?.hand ?? []) : [];
  const turn = snapshot?.turn;
  const phase = turn?.phase ?? "idle";
  const attackerIndex = turn?.attackerIndex ?? 0;
  const defenderIndex = turn?.defenderIndex ?? 0;
  const table = turn?.table ?? [];
  const isAttacker = mySeatIndex >= 0 && attackerIndex === mySeatIndex;
  const isDefender = mySeatIndex >= 0 && defenderIndex === mySeatIndex;
  const trumpSuit = snapshot?.trumpSuit ?? "S";
  const ranksOnTable = Array.from(new Set(table.flatMap((p) => [p.attack.rank, p.defence?.rank].filter(Boolean))));

  const loadState = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await axios.get(`/api/match/state/${matchId}`);
      setSnapshot(res.data as MatchSnapshot);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (!matchId || !socket) return;
    socket.emit("join_match", { matchId }, (res: { ok: boolean }) => {
      if (!res?.ok) return;
    });
    const onState = (data: { matchId?: string }) => {
      if (data?.matchId === matchId) loadState();
    };
    socket.on("match_state", onState);
    return () => {
      socket.off("match_state", onState);
      socket.emit("leave_match", { matchId });
    };
  }, [matchId, socket]);

  function sendCommand(type: string, payload: unknown) {
    if (!matchId || !socket || sending) return;
    setSending(true);
    const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    socket.emit("command", { id, matchId, type, payload }, (res: { ok: boolean; error?: string }) => {
      setSending(false);
      if (!res?.ok && res?.error) loadState();
    });
  }

  function handleAttack(cards: Card[]) {
    if (!isAttacker || phase !== "attack" || cards.length === 0) return;
    if (table.length > 0 && cards.some((c) => !ranksOnTable.includes(c.rank))) return;
    sendCommand("ATTACK", { cards });
  }

  function handleDefend(attackIndex: number, card: Card) {
    if (!isDefender || phase !== "defence") return;
    sendCommand("DEFEND", { attackIndex, card });
  }

  function handleTake() {
    if (!isDefender || phase !== "defence") return;
    sendCommand("TAKE", {});
  }

  function handlePass() {
    if (!isAttacker || phase !== "attack" || table.length === 0) return;
    sendCommand("PASS", {});
  }

  function handleCleanup() {
    if (!isAttacker || phase !== "cleanup") return;
    sendCommand("CLEANUP", {});
  }

  function handleTransfer(card: Card) {
    if (!isDefender || phase !== "defence" || snapshot?.variant !== "transferable") return;
    if (!ranksOnTable.includes(card.rank)) return;
    sendCommand("TRANSFER", { card });
  }

  if (loading && !snapshot) {
    return <div style={{ padding: 16 }}>Загрузка матча...</div>;
  }
  if (!snapshot) {
    return <div style={{ padding: 16 }}>Матч не найден.</div>;
  }
  if (snapshot.status === "finished") {
    const winner = snapshot.players.find((p) => p.isWinner);
    const loser = snapshot.players.find((p) => !p.isWinner && !p.isBot);
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <h2 style={{ fontSize: 20 }}>Игра окончена</h2>
        <p>{winner ? (winner.isBot ? "Победил бот" : "Вы победили!") : "Дурак"}: место {snapshot.players.findIndex((p) => p.isWinner) + 1}</p>
        {loser && <p>Проигравший: место {snapshot.players.findIndex((p) => !p.isWinner && !p.isBot) + 1}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, minHeight: 200 }}>
      <div style={{ fontSize: 14, opacity: 0.9 }}>
        Козырная масть: <span style={{ color: SUIT_COLORS[trumpSuit], fontWeight: 600 }}>{SUIT_SYMBOLS[trumpSuit]} {snapshot.trumpCard}</span>
        {" · "}Колода: {snapshot.deck.remainingCount}
      </div>

      <div style={{ minHeight: 80, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: 8, background: "rgba(15,23,42,0.5)", borderRadius: 12 }}>
        {table.map((pair, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
            <div
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(30,41,59,0.9)",
                color: SUIT_COLORS[pair.attack.suit],
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {pair.attack.suit}{pair.attack.rank}
            </div>
            {pair.defence ? (
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(30,41,59,0.9)",
                  color: SUIT_COLORS[pair.defence.suit],
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {pair.defence.suit}{pair.defence.rank}
              </div>
            ) : (
              isDefender && phase === "defence" && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                  {myHand.filter((c) => {
                    const attack = pair.attack;
                    if (c.suit === attack.suit && ["6","7","8","9","10","J","Q","K","A"].indexOf(c.rank) > ["6","7","8","9","10","J","Q","K","A"].indexOf(attack.rank)) return true;
                    if (c.suit === trumpSuit && attack.suit !== trumpSuit) return true;
                    return false;
                  }).map((c) => (
                    <button
                      key={cardKey(c)}
                      type="button"
                      onClick={() => handleDefend(idx, c)}
                      disabled={sending}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "rgba(34,197,94,0.4)",
                        color: SUIT_COLORS[c.suit],
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {c.suit}{c.rank}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {phase === "defence" && isDefender && (
        <button
          type="button"
          onClick={handleTake}
          disabled={sending}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "rgba(239,68,68,0.4)",
            color: "#fca5a5",
            fontWeight: 600,
          }}
        >
          Взять
        </button>
      )}

      {phase === "attack" && isAttacker && table.length > 0 && (
        <button
          type="button"
          onClick={handlePass}
          disabled={sending}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "rgba(148,163,184,0.3)",
            color: "#e2e8f0",
            fontWeight: 600,
          }}
        >
          Бито
        </button>
      )}

      {phase === "cleanup" && isAttacker && (
        <button
          type="button"
          onClick={handleCleanup}
          disabled={sending}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "rgba(34,197,94,0.4)",
            color: "#86efac",
            fontWeight: 600,
          }}
        >
          Забрать
        </button>
      )}

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        {isAttacker && phase === "attack" && "Ваш ход: подкиньте карту того же достоинства, что на столе, или начните с любой."}
        {isDefender && phase === "defence" && "Ваш ход: покройте карту или переведите (переводной)."}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", paddingTop: 12 }}>
        {myHand.map((c) => {
          const canAttack = isAttacker && phase === "attack" && (table.length === 0 || ranksOnTable.includes(c.rank));
          const canTransfer = isDefender && phase === "defence" && snapshot.variant === "transferable" && ranksOnTable.includes(c.rank);
          const used = !canAttack && !canTransfer;
          return (
            <button
              key={cardKey(c)}
              type="button"
              disabled={sending || used}
              onClick={() => {
                if (canAttack) handleAttack([c]);
                if (canTransfer) handleTransfer(c);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `2px solid ${used ? "rgba(148,163,184,0.3)" : "rgba(34,197,94,0.6)"}`,
                background: used ? "rgba(30,41,59,0.8)" : "rgba(15,23,42,0.9)",
                color: SUIT_COLORS[c.suit],
                fontWeight: 700,
                fontSize: 16,
                opacity: used ? 0.6 : 1,
              }}
            >
              {c.suit}{c.rank}
            </button>
          );
        })}
      </div>
    </div>
  );
};
