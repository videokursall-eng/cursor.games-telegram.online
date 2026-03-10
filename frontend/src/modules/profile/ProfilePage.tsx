import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../shared/authContext";

interface ProfileData {
  user: { id: number; username?: string | null };
  profile: {
    rating: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    longestStreak: number;
  };
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;
    axios.get<ProfileData>("/api/stats/me/profile").then((res) => {
      if (!cancelled) setData(res.data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const username = data?.user.username || user?.username || null;
  const rating = data?.profile.rating ?? 1000;
  const played = data?.profile.gamesPlayed ?? 0;
  const won = data?.profile.gamesWon ?? 0;
  const lost = data?.profile.gamesLost ?? 0;
  const streak = data?.profile.longestStreak ?? 0;

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
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Профиль</h2>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 16,
          background: "rgba(15,23,42,0.7)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
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
              background: "#020617",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5e7eb",
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            {username?.[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{username ? `@${username}` : "Гость"}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Рейтинг: {rating}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {[
          { label: "Игр сыграно", value: played },
          { label: "Побед", value: won },
          { label: "Поражений", value: lost },
          { label: "Лучшая серия", value: streak },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{ borderRadius: 14, padding: 10, background: "rgba(15,23,42,0.75)" }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

