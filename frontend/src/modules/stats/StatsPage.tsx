import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
    return () => {
      cancelled = true;
    };
  }, []);

  const lifetime = stats?.find((s) => s.period === "lifetime");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13 }}
        >
          ← Назад
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Статистика</h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          fontSize: 13,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            padding: 10,
            background: "rgba(15,23,42,0.75)",
          }}
        >
          <div style={{ opacity: 0.7 }}>Игр сыграно</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {lifetime?.matchesPlayed ?? 0}
          </div>
        </div>
        <div
          style={{
            borderRadius: 14,
            padding: 10,
            background: "rgba(15,23,42,0.75)",
          }}
        >
          <div style={{ opacity: 0.7 }}>Побед</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {lifetime?.matchesWon ?? 0}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
          Таблица лидеров
        </h3>
        <div
          style={{
            borderRadius: 14,
            padding: 8,
            background: "rgba(15,23,42,0.75)",
            fontSize: 13,
          }}
        >
          {leaders.slice(0, 5).map((entry) => (
            <div
              key={entry.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <span style={{ opacity: 0.7 }}>#{entry.position}</span>
              <span>{entry.username || `Игрок ${entry.userId}`}</span>
              <span style={{ fontWeight: 600 }}>{entry.rating}</span>
            </div>
          ))}
          {leaders.length === 0 && (
            <div style={{ opacity: 0.7 }}>Недостаточно данных.</div>
          )}
        </div>
      </div>
    </div>
  );
};

