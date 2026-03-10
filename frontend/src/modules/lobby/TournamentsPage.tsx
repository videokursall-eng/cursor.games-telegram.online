import React from "react";
import { Link } from "react-router-dom";

interface Tournament {
  id: string;
  name: string;
  status: "upcoming" | "active" | "finished";
  prizePool: number;
  entryFee: number;
  playersCount: number;
  maxPlayers: number;
  startTime: string;
  variant: "classic" | "transferable";
}

const SAMPLE_TOURNAMENTS: Tournament[] = [
  {
    id: "t1",
    name: "Вечерний турнир",
    status: "active",
    prizePool: 5000,
    entryFee: 0,
    playersCount: 14,
    maxPlayers: 16,
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    variant: "classic",
  },
  {
    id: "t2",
    name: "Турнир выходного дня",
    status: "upcoming",
    prizePool: 10000,
    entryFee: 50,
    playersCount: 8,
    maxPlayers: 32,
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    variant: "transferable",
  },
  {
    id: "t3",
    name: "Чемпионат Дурак Pro",
    status: "upcoming",
    prizePool: 50000,
    entryFee: 200,
    playersCount: 0,
    maxPlayers: 64,
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    variant: "classic",
  },
];

const STATUS_CONFIG = {
  active: { label: "Идёт", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  upcoming: { label: "Скоро", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  finished: { label: "Завершён", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) {
    const mins = Math.floor(Math.abs(diff) / 60000);
    return `${mins} мин назад`;
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `через ${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `через ${hours} ч`;
  return `${Math.floor(hours / 24)} дн.`;
}

export const TournamentsPage: React.FC = () => {
  const active = SAMPLE_TOURNAMENTS.filter((t) => t.status === "active");
  const upcoming = SAMPLE_TOURNAMENTS.filter((t) => t.status === "upcoming");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          to="/"
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.5)",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          ← Лобби
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>🏆 Турниры</h2>
      </div>

      {active.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
            🔥 Активные
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.map((t) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
          📅 Предстоящие
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      </div>
    </div>
  );
};

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const statusConf = STATUS_CONFIG[t.status];

  return (
    <div
      style={{
        padding: "14px",
        borderRadius: 16,
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(148,163,184,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {t.variant === "classic" ? "Классический" : "Переводной"}
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            background: statusConf.bg,
            color: statusConf.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {statusConf.label}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b" }}>🪙 {t.prizePool.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Призовой фонд</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t.playersCount}/{t.maxPlayers}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Участников</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{formatTime(t.startTime)}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>{t.status === "active" ? "Начался" : "Старт"}</div>
        </div>
      </div>

      <button
        type="button"
        disabled={t.status === "finished"}
        style={{
          padding: "10px",
          borderRadius: 12,
          border: "none",
          background: t.status === "active"
            ? "linear-gradient(135deg, #22c55e, #16a34a)"
            : t.status === "upcoming"
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "rgba(148,163,184,0.15)",
          color: t.status === "finished" ? "#64748b" : t.status === "active" ? "#022c22" : "#1c1008",
          fontWeight: 700,
          fontSize: 14,
          cursor: t.status === "finished" ? "not-allowed" : "pointer",
        }}
      >
        {t.status === "active" ? "Войти в турнир" : t.status === "upcoming" ? `Записаться${t.entryFee > 0 ? ` · 🪙 ${t.entryFee}` : " · Бесплатно"}` : "Завершён"}
      </button>
    </div>
  );
}
