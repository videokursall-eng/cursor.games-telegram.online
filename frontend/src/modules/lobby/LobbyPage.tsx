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
        if (!cancelled) setOverview({
          rooms: [],
          userStats: { matchesPlayed: 0, matchesWon: 0, rating: 1000 },
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "conic-gradient(from 180deg, #22c55e, #0ea5e9, #a855f7, #22c55e)",
              padding: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#020617",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5e7eb",
                fontWeight: 600,
              }}
            >
              {user?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Добро пожаловать</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.username ? `@${user.username}` : "Гость"}</div>
          </div>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.8)",
            fontSize: 12,
            textAlign: "right",
          }}
        >
          <div style={{ opacity: 0.7 }}>Рейтинг</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{rating}</div>
          <div style={{ opacity: 0.7 }}>
            Игр: {played} · Побед: {won}
          </div>
        </div>
      </header>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0 0" }}>Дурак онлайн</h1>
      <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>Выберите режим и начните партию за несколько секунд.</p>

      <section style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 10, marginTop: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={quickHumanGame}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#022c22",
              fontWeight: 600,
              fontSize: 15,
              textAlign: "left",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Быстрая игра
            <div style={{ fontSize: 12, opacity: 0.9 }}>Подбор открытой комнаты или создание новой</div>
          </button>
          <button
            type="button"
            onClick={quickBotsGame}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#e0f2fe",
              fontWeight: 600,
              fontSize: 15,
              textAlign: "left",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Игра с ботами
            <div style={{ fontSize: 12, opacity: 0.9 }}>Заполнить стол ботами и сыграть в одиночку</div>
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/rooms/create"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(22,163,74,0.25)",
                border: "1px solid rgba(34,197,94,0.6)",
                color: "#bbf7d0",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Создать комнату
            </Link>
            <Link
              to="/join"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(30,64,175,0.4)",
                border: "1px solid rgba(59,130,246,0.7)",
                color: "#bfdbfe",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Войти по коду
            </Link>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/profile"
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(148,163,184,0.4)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Профиль
            </Link>
            <Link
              to="/stats"
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(148,163,184,0.4)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              История и статистика
            </Link>
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            padding: 10,
            background: "radial-gradient(circle at top, rgba(34,197,94,0.25), rgba(15,23,42,0.95))",
            fontSize: 13,
            maxHeight: 260,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Публичные комнаты</span>
            {loading && <span style={{ fontSize: 11, opacity: 0.7 }}>Обновление…</span>}
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
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
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(15,23,42,0.8)",
                  color: "#e5e7eb",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontWeight: 500 }}>
                    {room.variant === "transferable" ? "Переводной" : "Классический"}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                    {room.humanCount + room.botCount}/{room.maxPlayers}
                  </span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  Игроки: {room.humanCount} · Боты: {room.botCount}
                </div>
              </button>
            ))}
            {overview && overview.rooms.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Пока нет открытых комнат. Создайте первую!</div>
            )}
          </div>
        </div>
      </section>

      {overview?.activeMatchId && (
        <button
          type="button"
          onClick={() => navigate(`/match/${overview.activeMatchId}`)}
          style={{
            marginTop: 4,
            padding: "8px 12px",
            borderRadius: 999,
            border: "none",
            background: "rgba(34,197,94,0.25)",
            color: "#bbf7d0",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Вернуться в текущий матч
        </button>
      )}
    </div>
  );
};

