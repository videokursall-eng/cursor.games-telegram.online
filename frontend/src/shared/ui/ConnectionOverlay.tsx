import React from "react";
import { useRealtimeStatus } from "../realtimeClient";

export const ConnectionOverlay: React.FC = () => {
  const status = useRealtimeStatus();

  if (status === "connected") return null;

  const text =
    status === "connecting"
      ? "Подключение к серверу..."
      : status === "reconnecting"
      ? "Восстановление соединения..."
      : "Нет соединения. Идёт попытка переподключения...";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          marginBottom: 16,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(10,10,10,0.85)",
          color: "#f9fafb",
          fontSize: 12,
          backdropFilter: "blur(12px)",
          pointerEvents: "auto",
        }}
      >
        {text}
      </div>
    </div>
  );
};

