import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../shared/authContext";

interface Overview {
  activeMatchId: string | null;
  userStats: {
    matchesPlayed: number;
    matchesWon: number;
    rating: number;
  };
}

interface RecentMatch {
  matchId: string;
  variant: string;
  status: string;
  isWinner: boolean | null;
  createdAt: string;
  opponentName?: string;
}

export const ActiveMatchesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [overviewRes, statsRes] = await Promise.all([
          axios.get<Overview>("/api/room/overview").catch(() => ({ data: { activeMatchId: null, userStats: { matchesPlayed: 0, matchesWon: 0, rating: 1000 } } })),
          axios.get("/api/stats/me").catch(() => ({ data: { recentMatches: [] } })),
        ]);
        if (cancelled) return;
        const overviewData = overviewRes.data as Overview;
        setActiveMatchId(overviewData.activeMatchId);
        setRecentMatches((statsRes.data as { recentMatches?: RecentMatch[] }).recentMatches ?? []);
      } catch {
        // noop
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#94a3b8" }}>
        Загрузка матчей...
      </div>
    );
  }

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
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>🎮 Мои матчи</h2>
      </div>

      {activeMatchId && (
        <div
          style={{
            padding: "14px",
            borderRadius: 16,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 28 }}>🃏</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>Активный матч</div>
            <div style={{ fontSize: 12, color: "#86efac", marginTop: 2 }}>Игра в процессе — продолжите!</div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/match/${activeMatchId}`)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#022c22",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Играть →
          </button>
        </div>
      )}

      {recentMatches.length > 0 ? (
        <div>
          <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
            История матчей
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentMatches.map((m) => (
              <div
                key={m.matchId}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(15,23,42,0.6)",
                  border: `1px solid ${m.isWinner === true ? "rgba(34,197,94,0.25)" : m.isWinner === false ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>
                  {m.isWinner === true ? "🏆" : m.isWinner === false ? "😔" : "⏸"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {m.variant === "transferable" ? "Переводной" : "Классический"}
                    {m.opponentName && <span style={{ color: "#64748b" }}> vs {m.opponentName}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {new Date(m.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: m.isWinner === true ? "#4ade80" : m.isWinner === false ? "#f87171" : "#94a3b8",
                  }}
                >
                  {m.isWinner === true ? "Победа" : m.isWinner === false ? "Поражение" : "В игре"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !activeMatchId && (
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(148,163,184,0.1)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 40 }}>🃏</span>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Нет матчей</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {user?.username ? `@${user.username}, начните` : "Начните"} первую игру в лобби!
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                marginTop: 4,
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#022c22",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              В лобби
            </button>
          </div>
        )
      )}
    </div>
  );
};
