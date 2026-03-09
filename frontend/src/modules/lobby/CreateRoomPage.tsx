import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const CreateRoomPage: React.FC = () => {
  const [variant, setVariant] = useState<"classic" | "transferable">("classic");
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await axios.post("/api/room/create", {
        variant,
        maxPlayers: 2,
        isPrivate,
      });
      const roomId: string = res.data.roomId;
      navigate(`/rooms/private/${roomId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Создать комнату</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 14,
        }}
      >
        <button
          type="button"
          onClick={() => setVariant("classic")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border:
              variant === "classic"
                ? "1px solid rgba(34,197,94,0.8)"
                : "1px solid rgba(148,163,184,0.4)",
            background:
              variant === "classic"
                ? "rgba(22,163,74,0.35)"
                : "rgba(15,23,42,0.6)",
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
            border:
              variant === "transferable"
                ? "1px solid rgba(34,197,94,0.8)"
                : "1px solid rgba(148,163,184,0.4)",
            background:
              variant === "transferable"
                ? "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))"
                : "rgba(15,23,42,0.6)",
            color: variant === "transferable" ? "#022c22" : "#e5e7eb",
            fontWeight: 600,
          }}
        >
          Переводной
        </button>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          borderRadius: 14,
          background: "rgba(15,23,42,0.8)",
          fontSize: 14,
        }}
      >
        <span>Приватная комната</span>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
      </label>
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        style={{
          marginTop: 8,
          padding: "10px 16px",
          borderRadius: 999,
          border: "none",
          background:
            "linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,1))",
          color: "#022c22",
          fontWeight: 600,
          fontSize: 15,
          opacity: creating ? 0.7 : 1,
        }}
      >
        {creating ? "Создание..." : "Создать комнату"}
      </button>
    </div>
  );
};

