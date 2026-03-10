import React from "react";
import { Link } from "react-router-dom";

export const LobbyPage: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Дурак</h1>
      <p style={{ fontSize: 14, opacity: 0.9, margin: 0 }}>
        Создайте комнату или присоединяйтесь по коду приглашения.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <Link
          to="/rooms/create"
          style={{
            display: "block",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(34, 197, 94, 0.2)",
            border: "1px solid rgba(34, 197, 94, 0.5)",
            color: "#bbf7d0",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Создать комнату
        </Link>
        <Link
          to="/join"
          style={{
            display: "block",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(59, 130, 246, 0.2)",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            color: "#93c5fd",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Войти по коду
        </Link>
        <Link
          to="/profile"
          style={{
            display: "block",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Профиль
        </Link>
      </div>
    </div>
  );
};

