import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const JoinByCodePage: React.FC = () => {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || joining) return;
    setError(null);
    setJoining(true);
    try {
      const res = await axios.post("/api/room/join", { inviteCode: trimmed });
      const roomId: string = res.data.roomId;
      navigate(`/rooms/private/${roomId}`);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? "Не удалось войти";
      setError(msg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13, flexShrink: 0 }}
        >
          ← Назад
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Войти по коду</h2>
      </div>
      <p style={{ fontSize: 14, opacity: 0.9, margin: 0 }}>
        Введите код приглашения из комнаты (например, от друга).
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Код приглашения"
        maxLength={32}
        style={{
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.4)",
          background: "rgba(15,23,42,0.8)",
          color: "#e2e8f0",
          fontSize: 16,
          letterSpacing: 2,
        }}
      />
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      <button
        type="button"
        onClick={handleJoin}
        disabled={joining || !code.trim()}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, rgba(59,130,246,1), rgba(37,99,235,1))",
          color: "#fff",
          fontWeight: 600,
          fontSize: 15,
          opacity: joining || !code.trim() ? 0.6 : 1,
        }}
      >
        {joining ? "Вход..." : "Войти в комнату"}
      </button>
    </div>
  );
};
