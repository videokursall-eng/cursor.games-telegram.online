import React from "react";

interface Props {
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        background: "radial-gradient(circle at top, #0f172a 0, #020617 55%, #000000 100%)",
        color: "#ffffff",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "12px 12px 20px",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            padding: 12,
            background:
              "radial-gradient(circle at 30% 0, rgba(34,197,94,0.6), transparent 55%), radial-gradient(circle at 80% 120%, rgba(34,197,94,0.4), transparent 55%), #052e16",
            boxShadow:
              "0 18px 45px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(148,163,184,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 1,
              borderRadius: 22,
              border: "1px solid rgba(15,118,110,0.6)",
              boxShadow:
                "0 0 0 1px rgba(15,118,110,0.2), 0 0 30px rgba(16,185,129,0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              padding: 12,
              background:
                "radial-gradient(circle at 20% 0, rgba(22,163,74,0.8), transparent 60%), radial-gradient(circle at 80% 120%, rgba(21,128,61,0.9), transparent 60%), #064e3b",
              boxShadow: "inset 0 12px 40px rgba(15,23,42,0.85)",
              minHeight: "60vh",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

