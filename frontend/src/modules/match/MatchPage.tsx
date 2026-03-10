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

const SUIT_SYMBOLS: Record<Suit, string> = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
const SUIT_COLORS: Record<Suit, string> = { S: "#1e293b", H: "#ef4444", D: "#ef4444", C: "#1e293b" };
const SUIT_TEXT_COLORS: Record<Suit, string> = { S: "#1e293b", H: "#ef4444", D: "#ef4444", C: "#1e293b" };

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

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  playable?: boolean;
  small?: boolean;
}

function PlayingCard({ card, onClick, disabled, selected, playable, small }: PlayingCardProps) {
  const color = SUIT_TEXT_COLORS[card.suit];
  const suit = SUIT_SYMBOLS[card.suit];
  const w = small ? 38 : 50;
  const h = small ? 54 : 70;
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        width: w,
        height: h,
        background: "#ffffff",
        borderRadius: 6,
        border: `1.5px solid ${selected ? "#22c55e" : playable ? "#22c55e" : "#d1d5db"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(34,197,94,0.5), 0 4px 12px rgba(0,0,0,0.4)"
          : "0 2px 6px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3px 4px",
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
        opacity: disabled ? 0.45 : 1,
        transform: selected ? "translateY(-8px)" : playable && onClick ? undefined : undefined,
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div style={{ color, fontSize: small ? 10 : 12, fontWeight: 700, lineHeight: 1 }}>
        {card.rank}
        <div style={{ fontSize: small ? 9 : 11, lineHeight: 1 }}>{suit}</div>
      </div>
      <div style={{ color, fontSize: small ? 16 : 20, textAlign: "center", lineHeight: 1 }}>{suit}</div>
      <div
        style={{
          color,
          fontSize: small ? 10 : 12,
          fontWeight: 700,
          lineHeight: 1,
          transform: "rotate(180deg)",
          alignSelf: "flex-end",
        }}
      >
        {card.rank}
        <div style={{ fontSize: small ? 9 : 11, lineHeight: 1 }}>{suit}</div>
      </div>
    </div>
  );
}

function CardBack({ small }: { small?: boolean }) {
  const w = small ? 38 : 50;
  const h = small ? 54 : 70;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background: "linear-gradient(135deg, #064e3b, #16a34a)",
        border: "1.5px solid #22c55e",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: small ? 14 : 18,
        flexShrink: 0,
      }}
    >
      ♠
    </div>
  );
}

export const MatchPage: React.FC = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const ranksOnTable = Array.from(
    new Set(table.flatMap((p) => [p.attack.rank, p.defence?.rank].filter(Boolean) as string[]))
  );

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#94a3b8" }}>
        Загрузка матча...
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>Матч не найден.</div>
    );
  }

  if (snapshot.status === "finished") {
    const myPlayer = mySeatIndex >= 0 ? snapshot.players[mySeatIndex] : null;
    const iWon = myPlayer?.isWinner;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64 }}>{iWon ? "🏆" : "😔"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>{iWon ? "Победа!" : "Поражение"}</h2>
        <p style={{ color: "#94a3b8" }}>{iWon ? "Поздравляем! Вы не дурак!" : "В следующий раз повезёт!"}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#022c22",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          В лобби
        </button>
      </div>
    );
  }

  const opponents = snapshot.players.filter((p, i) => i !== mySeatIndex);

  const RANKS = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minHeight: "60vh",
        background: "linear-gradient(180deg, #022c22 0%, #064e3b 40%, #065f46 100%)",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top bar: trump + deck */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Козырь:</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              background: "rgba(245,158,11,0.15)",
              borderRadius: 8,
              border: "1px solid rgba(245,158,11,0.4)",
            }}
          >
            <span style={{ color: SUIT_COLORS[trumpSuit], fontWeight: 700, fontSize: 14 }}>
              {SUIT_SYMBOLS[trumpSuit]}
            </span>
            <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13 }}>{snapshot.trumpCard}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Колода:</span>
          <span
            style={{
              padding: "3px 8px",
              background: "rgba(15,23,42,0.5)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {snapshot.deck.remainingCount} 🃏
          </span>
        </div>
      </div>

      {/* Opponents */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {opponents.map((opp) => {
          const isOppAttacker = opp.seatIndex === attackerIndex;
          const isOppDefender = opp.seatIndex === defenderIndex;
          return (
            <div
              key={opp.seatIndex}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                background: isOppAttacker
                  ? "rgba(34,197,94,0.2)"
                  : isOppDefender
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(15,23,42,0.4)",
                borderRadius: 12,
                border: `1px solid ${isOppAttacker ? "rgba(34,197,94,0.4)" : isOppDefender ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.15)"}`,
                minWidth: 70,
              }}
            >
              <span style={{ fontSize: 18 }}>{opp.isBot ? "🤖" : "👤"}</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {isOppAttacker ? "⚔️ Атака" : isOppDefender ? "🛡 Защита" : "Ожидание"}
              </span>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: Math.min(opp.cardsInHand, 8) }).map((_, i) => (
                  <CardBack key={i} small />
                ))}
              </div>
              <span style={{ fontSize: 10, color: "#64748b" }}>{opp.cardsInHand} карт</span>
            </div>
          );
        })}
      </div>

      {/* Table area */}
      <div
        style={{
          flex: 1,
          margin: "0 8px",
          padding: "10px 8px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: 100,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {table.length === 0 && (
          <span style={{ color: "#4b7c5a", fontSize: 13 }}>Стол пуст</span>
        )}
        {table.map((pair, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              alignItems: "center",
              position: "relative",
            }}
          >
            <PlayingCard card={pair.attack} small />
            {pair.defence ? (
              <div style={{ position: "absolute", top: 16, left: 8 }}>
                <PlayingCard card={pair.defence} small />
              </div>
            ) : (
              isDefender &&
              phase === "defence" && (
                <div
                  style={{
                    position: "absolute",
                    top: 58,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 3,
                    flexWrap: "wrap",
                    maxWidth: 200,
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  {myHand
                    .filter((c) => {
                      const attack = pair.attack;
                      if (
                        c.suit === attack.suit &&
                        RANKS.indexOf(c.rank) > RANKS.indexOf(attack.rank)
                      )
                        return true;
                      if (c.suit === trumpSuit && attack.suit !== trumpSuit) return true;
                      return false;
                    })
                    .map((c) => (
                      <button
                        key={cardKey(c)}
                        type="button"
                        onClick={() => handleDefend(idx, c)}
                        disabled={sending}
                        style={{
                          padding: "3px 6px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(34,197,94,0.8)",
                          color: SUIT_COLORS[c.suit],
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
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
      <div style={{ padding: "8px 12px", display: "flex", gap: 8, justifyContent: "center" }}>
        {phase === "defence" && isDefender && (
          <button
            type="button"
            onClick={handleTake}
            disabled={sending}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.25)",
              color: "#fca5a5",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Взять карты
          </button>
        )}
        {phase === "attack" && isAttacker && table.length > 0 && (
          <button
            type="button"
            onClick={handlePass}
            disabled={sending}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.3)",
              background: "rgba(148,163,184,0.15)",
              color: "#e2e8f0",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
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
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#022c22",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Забрать
          </button>
        )}
      </div>

      {/* Turn hint */}
      {(isAttacker || isDefender) && (
        <div
          style={{
            padding: "4px 12px 6px",
            textAlign: "center",
            fontSize: 11,
            color: "#4ade80",
            fontWeight: 500,
          }}
        >
          {isAttacker && phase === "attack" && (table.length === 0 ? "Ваш ход — атакуйте любой картой" : "Подкиньте карту того же достоинства или нажмите «Бито»")}
          {isDefender && phase === "defence" && "Покройте карту или нажмите «Взять карты»"}
        </div>
      )}

      {/* My hand */}
      <div
        style={{
          padding: "10px 8px 12px",
          background: "rgba(0,0,0,0.25)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            justifyContent: myHand.length <= 6 ? "center" : "flex-start",
          }}
        >
          {myHand.map((c) => {
            const canAttack =
              isAttacker &&
              phase === "attack" &&
              (table.length === 0 || ranksOnTable.includes(c.rank));
            const canTransfer =
              isDefender &&
              phase === "defence" &&
              snapshot.variant === "transferable" &&
              ranksOnTable.includes(c.rank);
            const isPlayable = canAttack || canTransfer;
            return (
              <PlayingCard
                key={cardKey(c)}
                card={c}
                playable={isPlayable}
                disabled={sending || !isPlayable}
                onClick={() => {
                  if (canAttack) handleAttack([c]);
                  if (canTransfer) handleTransfer(c);
                }}
              />
            );
          })}
          {myHand.length === 0 && (
            <span style={{ color: "#4b7c5a", fontSize: 13 }}>Нет карт</span>
          )}
        </div>
      </div>
    </div>
  );
};
