import React, { useState } from "react";
import { Link } from "react-router-dom";

export const SettingsPage: React.FC = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const toggle = (value: boolean, setter: (v: boolean) => void) => () => setter(!value);

  const ToggleRow = ({
    label,
    icon,
    value,
    onToggle,
  }: {
    label: string;
    icon: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(148,163,184,0.15)",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 500 }}>{label}</span>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? "#22c55e" : "rgba(148,163,184,0.2)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          to="/profile"
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
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Настройки</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ToggleRow
          label="Звуки"
          icon="🔊"
          value={soundEnabled}
          onToggle={toggle(soundEnabled, setSoundEnabled)}
        />
        <ToggleRow
          label="Вибрация"
          icon="📳"
          value={vibrationEnabled}
          onToggle={toggle(vibrationEnabled, setVibrationEnabled)}
        />
        <ToggleRow
          label="Анимации карт"
          icon="✨"
          value={animationsEnabled}
          onToggle={toggle(animationsEnabled, setAnimationsEnabled)}
        />
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(15,23,42,0.4)",
          border: "1px solid rgba(148,163,184,0.1)",
          fontSize: 12,
          color: "#475569",
          textAlign: "center",
        }}
      >
        Дурак · Telegram Mini App
      </div>
    </div>
  );
};
