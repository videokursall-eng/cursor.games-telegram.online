import React from "react";

export const SettingsPage: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Настройки</h2>
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
        <span>Звуки</span>
        <input type="checkbox" defaultChecked />
      </label>
    </div>
  );
};

