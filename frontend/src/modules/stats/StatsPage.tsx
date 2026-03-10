import React, { useEffect, useState } from "react";
import axios from "axios";

interface StatEntry {
  period: string;
  bucketDate: string;
  matchesPlayed: number;
  matchesWon: number;
  avgTurnTimeMs: number;
  maxStreak: number;
}

interface LeaderboardEntry {
  userId: number;
  username: string | null;
  rating: number;
  position: number;
}

export const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatEntry[] | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [meRes, lbRes] = await Promise.all([
          axios.get("/api/stats/me"),
          axios.get("/api/stats/leaderboard"),
        ]);
        if (cancelled) return;
        setStats(meRes.data.aggregates as StatEntry[]);
        setLeaders(lbRes.data.entries as LeaderboardEntry[]);
      } catch {
        if (!cancelled) {
          setStats([]);
          setLeaders([]);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const lifetime = stats?.find((s) => s.period === "lifetime");
  const played = lifetime?.matchesPlayed ?? 0;
  const won = lifetime?.matchesWon ?? 0;
  const losses = played - won;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
  const maxStreak = lifetime?.maxStreak ?? 0;

  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800 }}>Статистика</h2>

      {/* Personal stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800 }}>{played}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Игр сыграно</div>
        </div>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>{won}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Побед</div>
        </div>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171" }}>{losses}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Поражений</div>
        </div>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{maxStreak}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Макс. серия</div>
        </div>
      </div>

      {/* Win rate bar */}
      {played > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(15,23,42,0.5)",
            border: "1px solid rgba(148,163,184,0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "#94a3b8" }}>Процент побед</span>
            <span style={{ fontWeight: 700, color: "#4ade80" }}>{winRate}%</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(148,163,184,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${winRate}%`,
                borderRadius: 4,
                background: "linear-gradient(90deg, #22c55e, #16a34a)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>
          🏆 Таблица лидеров
        </div>
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.15)",
          }}
        >
          {leaders.slice(0, 10).map((entry, idx, arr) => (
            <div
              key={entry.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: idx % 2 === 0 ? "rgba(15,23,42,0.6)" : "rgba(15,23,42,0.4)",
                borderBottom: idx < arr.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none",
              }}
            >
              <span style={{ width: 28, fontSize: entry.position <= 3 ? 20 : 13, textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                {MEDAL[entry.position] ?? `#${entry.position}`}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
                {entry.username || `Игрок ${entry.userId}`}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: entry.position === 1 ? "#f59e0b" : entry.position === 2 ? "#e2e8f0" : entry.position === 3 ? "#fb923c" : "#94a3b8",
                }}
              >
                {entry.rating}
              </span>
            </div>
          ))}
          {leaders.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: "#475569", fontSize: 13 }}>
              Недостаточно данных для таблицы лидеров
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
