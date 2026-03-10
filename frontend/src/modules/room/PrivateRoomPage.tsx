import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../shared/authContext";

interface Member {
  userId: number | null;
  seatIndex: number;
  role: string;
  status: string;
  isBot?: boolean;
}

interface RoomState {
  roomId: string;
  status: string;
  variant: string;
  maxPlayers: number;
  botCount: number;
  members: Member[];
  activeMatchId: string | null;
  isPrivate: boolean;
  inviteToken: string | null | undefined;
}

export const PrivateRoomPage: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = state && user && state.members.some((m) => m.userId === user.id && m.role === "owner");
  const humanCount = state?.members.filter((m) => !m.isBot).length ?? 0;
  const totalCount = (state?.botCount ?? 0) + humanCount;
  const canStart = isOwner && state?.status === "waiting" && totalCount >= 2 && totalCount <= (state?.maxPlayers ?? 6);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!roomId) return;
      try {
        const res = await axios.get(`/api/room/state/${roomId}`);
        if (!cancelled) setState(res.data as RoomState);
      } catch {
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [roomId]);

  useEffect(() => {
    if (state?.activeMatchId) {
      navigate(`/match/${state.activeMatchId}`, { replace: true });
    }
  }, [state?.activeMatchId, navigate]);

  async function handleStart() {
    if (!roomId || !canStart || starting) return;
    setError(null);
    setStarting(true);
    try {
      const res = await axios.post("/api/room/start", { roomId });
      const matchId: string = res.data.matchId;
      navigate(`/match/${matchId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? "Ошибка старта");
    } finally {
      setStarting(false);
    }
  }

  function copyCode() {
    const code = state?.inviteToken ?? "";
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareInTelegram() {
    const code = state?.inviteToken ?? "";
    const url = `https://t.me/share/url?url=https://t.me/YourBot?startapp=room_${roomId}&text=Join my Durak game! Code: ${code}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  }

  if (loading || !state) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#94a3b8" }}>
        Загрузка комнаты...
      </div>
    );
  }

  const inviteCode = state.inviteToken ?? "—";
  const variantLabel = state.variant === "transferable" ? "Переводной" : "Классический";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.5)",
            color: "#94a3b8",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Лобби
        </button>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 10,
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#4ade80",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {variantLabel}
        </div>
      </div>

      {/* Room title */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>
          {state.isPrivate ? "🔒 Приватная комната" : "🌐 Открытая комната"}
        </h2>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
          {humanCount} игрок{humanCount !== 1 ? "а" : ""} · {state.botCount} бот{state.botCount !== 1 ? "а" : ""}
          {" · "}{state.maxPlayers} мест максимум
        </p>
      </div>

      {/* Invite code */}
      {state.isPrivate && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(15,23,42,0.65)",
            border: "1px dashed rgba(34,197,94,0.4)",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Код приглашения</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "#f1f5f9",
              marginBottom: 12,
              fontFamily: "monospace",
            }}
          >
            {inviteCode}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={copyCode}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: copied ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)",
                color: copied ? "#86efac" : "#93c5fd",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {copied ? "✓ Скопировано" : "📋 Копировать"}
            </button>
            <button
              type="button"
              onClick={shareInTelegram}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: "rgba(14,165,233,0.25)",
                color: "#7dd3fc",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ✈️ Поделиться
            </button>
          </div>
        </div>
      )}

      {/* Players list */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Игроки
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {state.members.map((m) => (
            <div
              key={m.seatIndex}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${m.userId === user?.id ? "rgba(34,197,94,0.4)" : "rgba(148,163,184,0.15)"}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: m.isBot ? "rgba(99,102,241,0.3)" : "rgba(34,197,94,0.2)",
                  border: `1px solid ${m.isBot ? "rgba(99,102,241,0.4)" : "rgba(34,197,94,0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {m.isBot ? "🤖" : "👤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {m.role === "owner" && "👑 "}
                  {m.isBot ? "Бот" : `Место ${m.seatIndex + 1}`}
                  {m.userId === user?.id && " (вы)"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{m.status}</div>
              </div>
            </div>
          ))}

          {Array.from({ length: Math.max(0, state.maxPlayers - state.members.length - state.botCount) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.3)",
                border: "1px dashed rgba(148,163,184,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: 0.6,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(148,163,184,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ⌛
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>Ожидание игрока...</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {isOwner && state.status === "waiting" && (
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart || starting}
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            border: "none",
            background: canStart ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(148,163,184,0.2)",
            color: canStart ? "#022c22" : "#64748b",
            fontWeight: 700,
            fontSize: 16,
            cursor: canStart ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          {starting ? "Запуск..." : canStart ? "▶ Начать игру" : `Нужно минимум 2 игрока`}
        </button>
      )}

      {state.status === "in_progress" && !state.activeMatchId && (
        <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center" }}>
          Игра уже идёт. Перейдите в матч из лобби.
        </p>
      )}
    </div>
  );
};
