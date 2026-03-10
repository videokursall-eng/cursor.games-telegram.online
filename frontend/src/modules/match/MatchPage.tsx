import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

interface MatchPlayer {
  userId: number | null;
  seatIndex: number;
  isBot: boolean;
  status: string;
  cardsInHand: number;
  cardsTaken: number;
  isWinner: boolean;
  hand?: Card[];
}

interface MatchSnapshot {
  matchId: string;
  variant: string;
  status: string;
  stateVersion: number;
  trumpSuit: Suit;
  trumpCard: string;
  players: MatchPlayer[];
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
  const navigate = useNavigate();
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
    return (
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13, marginBottom: 12 }}
        >
          ← В лобби
        </button>
        <div>Загрузка матча...</div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13, marginBottom: 12 }}
        >
          ← В лобби
        </button>
        <p style={{ color: "#f87171" }}>Матч не найден.</p>
      </div>
    );
  }

  if (snapshot.status === "finished") {
    const myPlayer = snapshot.players.find((p) => p.userId === myUserId);
    const loserPlayer = snapshot.players.find((p) => !p.isWinner && snapshot.players.some((w) => w.isWinner));
    const isLoser = myPlayer && !myPlayer.isWinner;
    const isWinner = myPlayer?.isWinner;

    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{isWinner ? "🏆" : isLoser ? "😔" : "🎴"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px 0" }}>
            {isWinner ? "Победа!" : isLoser ? "Вы остались в дураках!" : "Игра окончена"}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>
            {snapshot.variant === "transferable" ? "Переводной дурак" : "Классический дурак"}
          </p>
        </div>

        <div style={{ borderRadius: 14, padding: 12, background: "rgba(15,23,42,0.7)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, opacity: 0.8 }}>Итог</div>
          {snapshot.players.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13 }}>
              <span>
                {p.isBot ? "🤖 Бот" : p.userId === myUserId ? "👤 Вы" : `Игрок ${i + 1}`}
              </span>
              <span style={{ fontWeight: 600, color: p.isWinner ? "#22c55e" : "#f87171" }}>
                {p.isWinner ? "Победитель" : "Дурак"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,1))",
              color: "#022c22",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            В лобби
          </button>
          <button
            type="button"
            onClick={() => navigate("/stats")}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.7)",
              color: "#e2e8f0",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Моя статистика
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, minHeight: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13 }}
        >
          ← Лобби
        </button>
        <div style={{ fontSize: 13, opacity: 0.9, textAlign: "right" }}>
          Козырь: <span style={{ color: SUIT_COLORS[trumpSuit], fontWeight: 600 }}>{SUIT_SYMBOLS[trumpSuit]}</span>
          {" · "}Колода: {snapshot.deck.remainingCount}
        </div>
      </div>

      {/* Opponents */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {snapshot.players.filter((p) => p.userId !== myUserId).map((p, i) => (
          <div
            key={i}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              background: p.seatIndex === attackerIndex ? "rgba(34,197,94,0.25)" : p.seatIndex === defenderIndex ? "rgba(239,68,68,0.25)" : "rgba(15,23,42,0.7)",
              border: "1px solid rgba(148,163,184,0.2)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            <div>{p.isBot ? "🤖" : "👤"} {p.seatIndex === attackerIndex ? "Атака" : p.seatIndex === defenderIndex ? "Защита" : ""}</div>
            <div style={{ fontWeight: 600 }}>🃏×{p.cardsInHand}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ minHeight: 80, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: 8, background: "rgba(15,23,42,0.5)", borderRadius: 12 }}>
        {table.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.6, alignSelf: "center" }}>Стол пуст</div>
        )}
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
              {SUIT_SYMBOLS[pair.attack.suit]}{pair.attack.rank}
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
                {SUIT_SYMBOLS[pair.defence.suit]}{pair.defence.rank}
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
                      {SUIT_SYMBOLS[c.suit]}{c.rank}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
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
            Бито ✓
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
      </div>

      {/* Status hint */}
      <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center", minHeight: 18 }}>
        {isAttacker && phase === "attack" && table.length === 0 && "Ваш ход: выберите карту для атаки"}
        {isAttacker && phase === "attack" && table.length > 0 && "Подкиньте карту того же достоинства или нажмите Бито"}
        {isDefender && phase === "defence" && "Покройте карту или нажмите Взять"}
        {isAttacker && phase === "cleanup" && "Нажмите Забрать, чтобы завершить раунд"}
        {!isAttacker && !isDefender && phase !== "finished" && "Ожидание хода соперника..."}
      </div>

      {/* My hand */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
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
              {SUIT_SYMBOLS[c.suit]}{c.rank}
            </button>
          );
        })}
        {myHand.length === 0 && mySeatIndex >= 0 && (
          <div style={{ fontSize: 13, opacity: 0.6 }}>Рука пуста</div>
        )}
      </div>
    </div>
  );
};
