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
  const [leaving, setLeaving] = useState(false);
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
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Ошибка старта");
    } finally {
      setStarting(false);
    }
  }

  async function handleLeave() {
    if (!roomId || leaving) return;
    setLeaving(true);
    try {
      await axios.post("/api/room/leave", { roomId });
    } catch {
      // ignore errors, navigate anyway
    } finally {
      setLeaving(false);
      navigate("/");
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

  if (loading && !state) {
    return (
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13, marginBottom: 12 }}
        >
          ← В лобби
        </button>
        <div>Загрузка комнаты...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13, marginBottom: 12 }}
        >
          ← В лобби
        </button>
        <p style={{ color: "#f87171" }}>Комната не найдена.</p>
      </div>
    );
  }

  const inviteCode = state.inviteToken ?? null;
  const variantLabel = state.variant === "transferable" ? "Переводной" : "Классический";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13 }}
        >
          ← В лобби
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          {state.isPrivate ? "Приватная" : "Публичная"} · {variantLabel}
        </h2>
      </div>

      {state.isPrivate && inviteCode && (
        <div
          style={{
            padding: 12,
            borderRadius: 16,
            background: "rgba(15,23,42,0.7)",
            border: "1px dashed rgba(148,163,184,0.5)",
            fontSize: 14,
          }}
        >
          <div style={{ marginBottom: 6, opacity: 0.8 }}>Код приглашения</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ letterSpacing: 2, fontSize: 18 }}>{inviteCode}</strong>
            <button
              type="button"
              onClick={copyCode}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: copied ? "rgba(34,197,94,0.4)" : "rgba(59,130,246,0.4)",
                color: "#e2e8f0",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
          Участники ({humanCount}/{state.maxPlayers - state.botCount})
          {state.botCount > 0 && ` + ${state.botCount} бот${state.botCount === 1 ? "" : "ов"}`}
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {state.members.filter((m) => !m.isBot).map((m) => (
            <li
              key={m.seatIndex}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(148,163,184,0.2)",
                fontSize: 14,
              }}
            >
              Место {m.seatIndex + 1}: {m.role === "owner" ? "👑 Владелец" : "Игрок"}
              {m.userId === user?.id && " (вы)"}
            </li>
          ))}
        </ul>
        {state.botCount > 0 && (
          <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 10, background: "rgba(15,23,42,0.4)", fontSize: 13, opacity: 0.9 }}>
            🤖 {state.botCount} бот{state.botCount === 1 ? "" : "а"} готов{state.botCount === 1 ? "" : "ы"} к игре
          </div>
        )}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isOwner && state.status === "waiting" && (
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,1))",
              color: "#022c22",
              fontWeight: 600,
              fontSize: 15,
              opacity: !canStart || starting ? 0.6 : 1,
            }}
          >
            {starting ? "Старт..." : `Начать игру (${totalCount}/${state.maxPlayers})`}
          </button>
        )}

        {!isOwner && state.status === "waiting" && (
          <p style={{ fontSize: 13, opacity: 0.8, margin: 0, textAlign: "center" }}>
            Ожидание начала игры от хозяина комнаты...
          </p>
        )}

        {state.status === "in_progress" && state.activeMatchId && (
          <button
            type="button"
            onClick={() => navigate(`/match/${state.activeMatchId}`)}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, rgba(59,130,246,1), rgba(37,99,235,1))",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Перейти к матчу →
          </button>
        )}

        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.5)",
            background: "rgba(239,68,68,0.15)",
            color: "#fca5a5",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {leaving ? "Выход..." : "Покинуть комнату"}
        </button>
      </div>
    </div>
  );
};
