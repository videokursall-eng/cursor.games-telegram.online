import React from "react";
import { useNavigate } from "react-router-dom";

export const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontSize: 13 }}
        >
          ← Назад
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Магазин косметики</h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          fontSize: 13,
        }}
      >
        <button
          type="button"
          style={{
            borderRadius: 16,
            padding: 10,
            border: "1px solid rgba(34,197,94,0.7)",
            background:
              "radial-gradient(circle at 20% 0, rgba(22,163,74,0.7), transparent 60%), rgba(15,23,42,0.95)",
            color: "#bbf7d0",
          }}
        >
          Зелёная рубашка
        </button>
        <button
          type="button"
          style={{
            borderRadius: 16,
            padding: 10,
            border: "1px solid rgba(56,189,248,0.7)",
            background:
              "radial-gradient(circle at 20% 0, rgba(59,130,246,0.6), transparent 60%), rgba(15,23,42,0.95)",
            color: "#dbeafe",
          }}
        >
          Неоновый стол
        </button>
      </div>
    </div>
  );
};

