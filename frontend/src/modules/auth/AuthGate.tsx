import React from "react";
import { useTelegramAuth } from "./useTelegramAuth";

interface Props {
  children: React.ReactNode;
}

export const AuthGate: React.FC<Props> = ({ children }) => {
  const { loading, error, refresh } = useTelegramAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            height: 32,
            borderRadius: 8,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.18), rgba(255,255,255,0.08))",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
          }}
        />
        <div
          style={{
            height: 180,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
        <style>
          {`
          @keyframes shimmer {
            0% { background-position: 0% 0; }
            100% { background-position: -200% 0; }
          }
        `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>Ошибка авторизации: {error}</div>
        <button
          type="button"
          onClick={refresh}
          style={{
            borderRadius: 999,
            padding: "10px 16px",
            border: "none",
            background: "#2b7cff",
            color: "#fff",
            fontSize: 14,
          }}
        >
          Повторить вход
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

