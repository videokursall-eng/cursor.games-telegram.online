import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/authContext";

interface StatEntry {
  period: string;
  matchesPlayed: number;
  matchesWon: number;
  maxStreak: number;
}

interface RecentMatch {
  matchId: string;
  variant: string;
  status: string;
  isWinner: boolean | null;
  createdAt: string;
}

interface Overview {
  userStats: {
    matchesPlayed: number;
    matchesWon: number;
    rating: number;
    coins?: number;
  };
}

function getRankLabel(rating: number): string {
  if (rating >= 2000) return "🏆 Гроссмейстер";
  if (rating >= 1600) return "💎 Мастер";
  if (rating >= 1300) return "🥇 Эксперт";
  if (rating >= 1100) return "🥈 Опытный";
  return "🥉 Новичок";
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatEntry | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsRes, overviewRes] = await Promise.all([
          axios.get("/api/stats/me").catch(() => ({ data: { aggregates: [] } })),
          axios.get("/api/room/overview").catch(() => ({ data: { userStats: { matchesPlayed: 0, matchesWon: 0, rating: 1000 } } })),
        ]);
        if (cancelled) return;
        const aggregates: StatEntry[] = statsRes.data.aggregates ?? [];
        const lifetime = aggregates.find((s: StatEntry) => s.period === "lifetime") ?? null;
        setStats(lifetime);
        setOverview(overviewRes.data as Overview);
        const matches: RecentMatch[] = statsRes.data.recentMatches ?? [];
        setRecentMatches(matches.slice(0, 5));
      } catch (err) {
        console.error("ProfilePage: failed to load data", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const rating = overview?.userStats.rating ?? 1000;
  const played = overview?.userStats.matchesPlayed ?? stats?.matchesPlayed ?? 0;
  const won = overview?.userStats.matchesWon ?? stats?.matchesWon ?? 0;
  const losses = played - won;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
  const coins = overview?.userStats?.coins ?? 100;
  const maxStreak = stats?.maxStreak ?? 0;
  const initial = user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Avatar + info */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 8 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "conic-gradient(from 180deg, #22c55e, #0ea5e9, #a855f7, #f59e0b, #22c55e)",
            padding: 3,
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
              fontSize: 32,
              fontWeight: 700,
              color: "#f1f5f9",
            }}
          >
            {initial}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            {user?.username ? `@${user.username}` : "Игрок"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Telegram ID: {user?.id ?? "—"}
          </div>
          <div
            style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              fontSize: 13,
              color: "#f59e0b",
              fontWeight: 600,
            }}
          >
            {getRankLabel(rating)}
          </div>
        </div>
      </div>

      {/* Coins */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "10px",
          background: "rgba(245,158,11,0.1)",
          borderRadius: 14,
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <span style={{ fontSize: 24 }}>🪙</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{coins}</div>
          <div style={{ fontSize: 11, color: "#78716c" }}>монет</div>
        </div>
      </div>

      {/* Stats grid */}
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
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{won}</div>
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
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{losses}</div>
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
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{winRate}%</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Процент побед</div>
        </div>
      </div>

      {/* Rating + streak */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(22,163,74,0.1))",
            border: "1px solid rgba(34,197,94,0.25)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>{rating}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Рейтинг ELO</div>
        </div>
        <div
          style={{
            padding: "12px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))",
            border: "1px solid rgba(245,158,11,0.25)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>{maxStreak}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Макс. серия</div>
        </div>
      </div>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
            Последние матчи
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentMatches.map((m) => (
              <div
                key={m.matchId}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(15,23,42,0.5)",
                  border: `1px solid ${m.isWinner === true ? "rgba(34,197,94,0.25)" : m.isWinner === false ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {m.variant === "transferable" ? "Переводной" : "Классический"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{new Date(m.createdAt).toLocaleDateString("ru")}</div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: m.isWinner === true ? "#4ade80" : m.isWinner === false ? "#f87171" : "#94a3b8",
                  }}
                >
                  {m.isWinner === true ? "Победа" : m.isWinner === false ? "Поражение" : "Незавершён"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings link */}
      <Link
        to="/settings"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(148,163,184,0.15)",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        <span>⚙️</span>
        <span>Настройки</span>
        <span style={{ marginLeft: "auto" }}>→</span>
      </Link>
    </div>
  );
};
