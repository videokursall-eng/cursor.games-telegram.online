import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/authContext";

interface OverviewRoom {
  id: string;
  variant: "classic" | "transferable";
  maxPlayers: number;
  isPrivate: boolean;
  humanCount: number;
  botCount: number;
}

interface Overview {
  rooms: OverviewRoom[];
  userStats: {
    matchesPlayed: number;
    matchesWon: number;
    rating: number;
    coins?: number;
  };
  activeMatchId: string | null;
}

export const LobbyPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get("/api/room/overview");
        if (!cancelled) setOverview(res.data as Overview);
      } catch {
        if (!cancelled)
          setOverview({
            rooms: [],
            userStats: { matchesPlayed: 0, matchesWon: 0, rating: 1000, coins: 100 },
            activeMatchId: null,
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function quickHumanGame() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await axios.get<Overview>("/api/room/overview");
      const rooms = res.data.rooms.filter((r) => !r.isPrivate && r.variant === "classic");
      if (rooms.length > 0) {
        const room = rooms[0]!;
        const join = await axios.post("/api/room/join", { roomId: room.id });
        navigate(`/rooms/private/${join.data.roomId}`);
      } else {
        const created = await axios.post("/api/room/create", {
          variant: "classic",
          maxPlayers: 4,
          isPrivate: false,
          botCount: 0,
        });
        navigate(`/rooms/private/${created.data.roomId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function quickBotsGame() {
    if (busy) return;
    setBusy(true);
    try {
      const created = await axios.post("/api/room/create", {
        variant: "classic",
        maxPlayers: 4,
        isPrivate: true,
        botCount: 3,
      });
      const roomId: string = created.data.roomId;
      navigate(`/rooms/private/${roomId}`);
    } finally {
      setBusy(false);
    }
  }

  const rating = overview?.userStats.rating ?? 1000;
  const played = overview?.userStats.matchesPlayed ?? 0;
  const won = overview?.userStats.matchesWon ?? 0;
  const coins = overview?.userStats?.coins ?? 100;
  const initial = user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {overview?.activeMatchId && (
        <button
          type="button"
          onClick={() => navigate(`/match/${overview.activeMatchId}`)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(34,197,94,0.5)",
            background: "rgba(34,197,94,0.15)",
            color: "#bbf7d0",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🎯</span>
          <span>Вернуться в текущий матч →</span>
        </button>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "rgba(15,23,42,0.6)",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.15)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "conic-gradient(from 180deg, #22c55e, #0ea5e9, #a855f7, #22c55e)",
            padding: 2,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5e7eb",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {initial}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {user?.username ? `@${user.username}` : "Гость"}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Рейтинг: <span style={{ color: "#22c55e", fontWeight: 600 }}>{rating}</span>
            {" · "}Побед: <span style={{ fontWeight: 600 }}>{won}</span>/{played}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: "rgba(245,158,11,0.15)",
            borderRadius: 10,
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <span style={{ fontSize: 16 }}>🪙</span>
          <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: 15 }}>{coins}</span>
        </div>
      </div>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Дурак онлайн</h1>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          Классическая карточная игра с живыми игроками
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          onClick={quickHumanGame}
          disabled={busy}
          style={{
            padding: "16px 12px",
            borderRadius: 16,
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#022c22",
            fontWeight: 700,
            fontSize: 14,
            textAlign: "left",
            opacity: busy ? 0.6 : 1,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 24 }}>⚡</span>
          <span>Быстрая игра</span>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Живые игроки</span>
        </button>
        <button
          type="button"
          onClick={quickBotsGame}
          disabled={busy}
          style={{
            padding: "16px 12px",
            borderRadius: 16,
            border: "none",
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            color: "#e0f2fe",
            fontWeight: 700,
            fontSize: 14,
            textAlign: "left",
            opacity: busy ? 0.6 : 1,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 24 }}>🤖</span>
          <span>Игра с ботами</span>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Тренировка</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Link
          to="/rooms/create"
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(22,163,74,0.2)",
            border: "1px solid rgba(34,197,94,0.4)",
            color: "#bbf7d0",
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🎪</span>
          <span>Создать комнату</span>
        </Link>
        <Link
          to="/join"
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(30,64,175,0.3)",
            border: "1px solid rgba(59,130,246,0.5)",
            color: "#bfdbfe",
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🔑</span>
          <span>Войти по коду</span>
        </Link>
        <Link
          to="/tournaments"
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: "#fde68a",
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🏆</span>
          <span>Турниры</span>
        </Link>
        <Link
          to="/active-matches"
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.35)",
            color: "#e9d5ff",
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🎮</span>
          <span>Мои матчи</span>
        </Link>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Открытые комнаты
          </span>
          {loading && <span style={{ fontSize: 11, color: "#64748b" }}>Обновление…</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {overview?.rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => {
                if (busy) return;
                setBusy(true);
                axios
                  .post("/api/room/join", { roomId: room.id })
                  .then((join) => navigate(`/rooms/private/${join.data.roomId}`))
                  .finally(() => setBusy(false));
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.6)",
                color: "#e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {room.variant === "transferable" ? "🔄 Переводной" : "♠ Классический"}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  👥 {room.humanCount} чел · 🤖 {room.botCount} бот
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#22c55e",
                  background: "rgba(34,197,94,0.15)",
                  padding: "4px 8px",
                  borderRadius: 8,
                }}
              >
                {room.humanCount + room.botCount}/{room.maxPlayers}
              </div>
            </button>
          ))}
          {overview && overview.rooms.length === 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(15,23,42,0.4)",
                fontSize: 13,
                color: "#64748b",
                textAlign: "center",
              }}
            >
              Открытых комнат нет. Создайте первую! 🃏
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
