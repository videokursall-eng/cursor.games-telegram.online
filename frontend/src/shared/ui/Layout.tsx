import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: "/", icon: "🏠", label: "Лобби" },
  { path: "/active-matches", icon: "🎮", label: "Матчи" },
  { path: "/profile", icon: "👤", label: "Профиль" },
  { path: "/stats", icon: "📊", label: "Статистика" },
  { path: "/shop", icon: "🛒", label: "Магазин" },
] as const;

const HIDE_NAV_PREFIXES = ["/match/"];

export const Layout: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = HIDE_NAV_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #0f172a 0, #020617 55%, #000000 100%)",
        color: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main content */}
      <div
        style={{
          flex: 1,
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          padding: hideNav ? "12px 12px 20px" : `12px 12px calc(var(--bottom-nav-height, 64px) + 12px)`,
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            padding: 12,
            background:
              "radial-gradient(circle at 30% 0, rgba(34,197,94,0.5), transparent 55%), radial-gradient(circle at 80% 120%, rgba(34,197,94,0.35), transparent 55%), #052e16",
            boxShadow: "0 18px 45px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(148,163,184,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 1,
              borderRadius: 22,
              border: "1px solid rgba(15,118,110,0.5)",
              boxShadow: "0 0 0 1px rgba(15,118,110,0.15), 0 0 30px rgba(16,185,129,0.2)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              padding: 12,
              background:
                "radial-gradient(circle at 20% 0, rgba(22,163,74,0.7), transparent 60%), radial-gradient(circle at 80% 120%, rgba(21,128,61,0.85), transparent 60%), #064e3b",
              boxShadow: "inset 0 12px 40px rgba(15,23,42,0.8)",
              minHeight: "60vh",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "var(--bottom-nav-height, 64px)",
            background: "rgba(2,6,23,0.96)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(34,197,94,0.2)",
            display: "flex",
            alignItems: "stretch",
            zIndex: 100,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  border: "none",
                  background: "transparent",
                  color: isActive ? "#22c55e" : "#64748b",
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  transition: "color 0.15s",
                  padding: "6px 4px",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: 32,
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                      background: "#22c55e",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

