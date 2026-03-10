import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const CreateRoomPage: React.FC = () => {
  const [variant, setVariant] = useState<"classic" | "transferable">("classic");
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [botCount, setBotCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalSlots = maxPlayers;
  const humanSlots = totalSlots - botCount;
  const canStart = humanSlots >= 1 && humanSlots <= 6 && botCount >= 0 && botCount <= 5 && maxPlayers >= 2 && maxPlayers <= 6;

  async function handleCreate() {
    if (creating || !canStart) return;
    setError(null);
    setCreating(true);
    try {
      const res = await axios.post("/api/room/create", {
        variant,
        maxPlayers,
        isPrivate,
        botCount: Math.min(botCount, Math.max(0, maxPlayers - 1)),
      });
      const roomId: string = res.data.roomId;
      navigate(`/rooms/private/${roomId}`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Ошибка создания комнаты");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Создать комнату</h2>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Вариант игры</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => setVariant("classic")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: variant === "classic" ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.4)",
            background: variant === "classic" ? "rgba(22,163,74,0.35)" : "rgba(15,23,42,0.6)",
            color: "#e5e7eb",
          }}
        >
          Классический
        </button>
        <button
          type="button"
          onClick={() => setVariant("transferable")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: variant === "transferable" ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.4)",
            background: variant === "transferable" ? "rgba(22,163,74,0.35)" : "rgba(15,23,42,0.6)",
            color: "#e5e7eb",
          }}
        >
          Переводной
        </button>
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Тип комнаты</div>
      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 14, background: "rgba(15,23,42,0.8)", fontSize: 14 }}>
        <span>Приватная (вход по коду)</span>
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
      </label>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Игроков (2–6)</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setMaxPlayers(n);
              if (botCount > n - 1) setBotCount(Math.max(0, n - 1));
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: maxPlayers === n ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.4)",
              background: maxPlayers === n ? "rgba(22,163,74,0.35)" : "rgba(15,23,42,0.6)",
              color: "#e5e7eb",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Ботов (0–5)</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[0, 1, 2, 3, 4, 5].filter((b) => b < maxPlayers).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setBotCount(n)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: botCount === n ? "1px solid rgba(59,130,246,0.8)" : "1px solid rgba(148,163,184,0.4)",
              background: botCount === n ? "rgba(59,130,246,0.25)" : "rgba(15,23,42,0.6)",
              color: "#e5e7eb",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating || !canStart}
        style={{
          marginTop: 8,
          padding: "10px 16px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,1))",
          color: "#022c22",
          fontWeight: 600,
          fontSize: 15,
          opacity: creating || !canStart ? 0.6 : 1,
        }}
      >
        {creating ? "Создание..." : "Создать комнату"}
      </button>
    </div>
  );
};
