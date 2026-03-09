import React from "react";

export const ProfilePage: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Профиль</h2>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 16,
          background: "rgba(15,23,42,0.7)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background:
              "conic-gradient(from 180deg, #22c55e, #0ea5e9, #a855f7, #22c55e)",
            padding: 2,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#020617",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>@username</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Рейтинг: 1000</div>
        </div>
      </div>
    </div>
  );
};

