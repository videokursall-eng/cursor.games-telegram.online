import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? "Ошибка создания комнаты");
    } finally {
      setCreating(false);
    }
  }

  const btnBase: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
  };

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
          ← Назад
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Создать комнату</h2>
      </div>

      {/* Game variant */}
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
          Вариант игры
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setVariant("classic")}
            style={{
              ...btnBase,
              border: variant === "classic" ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.2)",
              background: variant === "classic" ? "rgba(22,163,74,0.25)" : "rgba(15,23,42,0.5)",
              color: variant === "classic" ? "#86efac" : "#94a3b8",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>♠</div>
            <div style={{ fontWeight: 600 }}>Классический</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>Традиционные правила</div>
          </button>
          <button
            type="button"
            onClick={() => setVariant("transferable")}
            style={{
              ...btnBase,
              border: variant === "transferable" ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.2)",
              background: variant === "transferable" ? "rgba(22,163,74,0.25)" : "rgba(15,23,42,0.5)",
              color: variant === "transferable" ? "#86efac" : "#94a3b8",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>🔄</div>
            <div style={{ fontWeight: 600 }}>Переводной</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>Можно переводить</div>
          </button>
        </div>
      </div>

      {/* Room type */}
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
          Тип комнаты
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            style={{
              ...btnBase,
              border: !isPrivate ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.2)",
              background: !isPrivate ? "rgba(22,163,74,0.25)" : "rgba(15,23,42,0.5)",
              color: !isPrivate ? "#86efac" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🌐</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Публичная</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Видна всем</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            style={{
              ...btnBase,
              border: isPrivate ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.2)",
              background: isPrivate ? "rgba(22,163,74,0.25)" : "rgba(15,23,42,0.5)",
              color: isPrivate ? "#86efac" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🔒</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Приватная</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>По коду</div>
            </div>
          </button>
        </div>
      </div>

      {/* Player count */}
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
          Игроков (2–6)
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setMaxPlayers(n);
                if (botCount > n - 1) setBotCount(Math.max(0, n - 1));
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: maxPlayers === n ? "2px solid #22c55e" : "1px solid rgba(148,163,184,0.2)",
                background: maxPlayers === n ? "rgba(22,163,74,0.3)" : "rgba(15,23,42,0.5)",
                color: maxPlayers === n ? "#86efac" : "#94a3b8",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Bot count */}
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
          Ботов (0–{maxPlayers - 1})
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[0, 1, 2, 3, 4, 5].filter((b) => b < maxPlayers).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBotCount(n)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: botCount === n ? "2px solid #0ea5e9" : "1px solid rgba(148,163,184,0.2)",
                background: botCount === n ? "rgba(14,165,233,0.2)" : "rgba(15,23,42,0.5)",
                color: botCount === n ? "#7dd3fc" : "#94a3b8",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(148,163,184,0.15)",
          fontSize: 13,
          color: "#94a3b8",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>Итог</div>
        <div>Вариант: <span style={{ color: "#f1f5f9" }}>{variant === "classic" ? "Классик" : "Переводной"}</span></div>
        <div>Тип: <span style={{ color: "#f1f5f9" }}>{isPrivate ? "Приватная" : "Публичная"}</span></div>
        <div>Всего мест: <span style={{ color: "#f1f5f9" }}>{maxPlayers}</span> (из них ботов: <span style={{ color: "#7dd3fc" }}>{botCount}</span>)</div>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating || !canStart}
        style={{
          padding: "14px 20px",
          borderRadius: 14,
          border: "none",
          background: canStart ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(148,163,184,0.15)",
          color: canStart ? "#022c22" : "#64748b",
          fontWeight: 700,
          fontSize: 16,
          cursor: canStart ? "pointer" : "not-allowed",
        }}
      >
        {creating ? "Создание..." : "Создать комнату"}
      </button>
    </div>
  );
};
