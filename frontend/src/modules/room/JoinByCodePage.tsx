import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      const msg = err?.response?.data?.error?.message ?? "Не удалось войти";
      setError(msg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Войти по коду</h2>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: 16,
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(148,163,184,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ fontSize: 13, color: "#94a3b8" }}>
          🔑 Введите код приглашения от друга, чтобы войти в его комнату.
        </p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="Код приглашения"
          maxLength={32}
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.3)",
            background: "rgba(15,23,42,0.8)",
            color: "#f1f5f9",
            fontSize: 18,
            letterSpacing: "0.15em",
            fontFamily: "monospace",
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
          }}
        />
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
          onClick={handleJoin}
          disabled={joining || !code.trim()}
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            border: "none",
            background: code.trim() && !joining
              ? "linear-gradient(135deg, #0ea5e9, #2563eb)"
              : "rgba(148,163,184,0.15)",
            color: code.trim() && !joining ? "#e0f2fe" : "#64748b",
            fontWeight: 700,
            fontSize: 16,
            cursor: code.trim() && !joining ? "pointer" : "not-allowed",
          }}
        >
          {joining ? "Вход..." : "Войти в комнату"}
        </button>
      </div>
    </div>
  );
};
