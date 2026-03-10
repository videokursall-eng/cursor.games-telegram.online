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
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Ошибка старта");
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

  if (loading || !state) {
    return <div style={{ padding: 16 }}>Загрузка комнаты...</div>;
  }

  const inviteCode = state.inviteToken ?? "—";
  const variantLabel = state.variant === "transferable" ? "Переводной" : "Классический";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>
        {state.isPrivate ? "Приватная комната" : "Комната"} · {variantLabel}
      </h2>

      {state.isPrivate && (
        <div
          style={{
            padding: 12,
            borderRadius: 16,
            background: "rgba(15,23,42,0.7)",
            border: "1px dashed rgba(148,163,184,0.5)",
            fontSize: 14,
          }}
        >
          <div style={{ marginBottom: 6 }}>Код приглашения</div>
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
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Участники ({humanCount} + {state.botCount} ботов)</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {state.members.map((m) => (
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
          <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
            Ботов в игре: {state.botCount}
          </p>
        )}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

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
          {starting ? "Старт..." : "Начать игру"}
        </button>
      )}

      {state.status === "in_progress" && !state.activeMatchId && (
        <p style={{ fontSize: 14, opacity: 0.9 }}>Игра уже идёт. Перейдите в матч из лобби.</p>
      )}
    </div>
  );
};
