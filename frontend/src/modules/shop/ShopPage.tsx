import React, { useEffect, useState } from "react";
import axios from "axios";

interface ShopItem {
  id: number;
  code: string;
  type: string;
  name: string;
  description: string;
  rarity: string;
  price: number;
  currency: string;
  isLimited: boolean;
}

const STATIC_ITEMS: ShopItem[] = [
  { id: 101, code: "back_blue", type: "card_back", name: "Синий океан", description: "Морская тематика", rarity: "rare", price: 100, currency: "coins", isLimited: false },
  { id: 102, code: "back_red", type: "card_back", name: "Красная роскошь", description: "Элегантный красный", rarity: "epic", price: 250, currency: "coins", isLimited: false },
  { id: 103, code: "back_gold", type: "card_back", name: "Золотая премиум", description: "Эксклюзив", rarity: "legendary", price: 500, currency: "coins", isLimited: true },
  { id: 201, code: "table_dark", type: "table_theme", name: "Тёмный бархат", description: "Стильный тёмный стол", rarity: "rare", price: 150, currency: "coins", isLimited: false },
  { id: 202, code: "table_neon", type: "table_theme", name: "Неоновая ночь", description: "Киберпанк стиль", rarity: "epic", price: 300, currency: "coins", isLimited: false },
];

const RARITY_COLORS: Record<string, string> = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export const ShopPage: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get("/api/cosmetics/owned");
        if (cancelled) return;
        const apiItems: ShopItem[] = res.data.items ?? [];
        const apiOwned: number[] = res.data.ownedItemIds ?? [];
        const apiItemIds = new Set(apiItems.map((a) => a.id));
        const merged = [...apiItems, ...STATIC_ITEMS.filter((s) => !apiItemIds.has(s.id))];
        setItems(merged);
        setOwnedIds(new Set(apiOwned));
      } catch {
        if (!cancelled) {
          setItems(STATIC_ITEMS);
          setOwnedIds(new Set());
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handlePurchase(item: ShopItem) {
    if (ownedIds.has(item.id) || purchasing !== null) return;
    setError(null);
    setPurchasing(item.id);
    try {
      await axios.post("/api/cosmetics/purchase", { itemId: item.id });
      setOwnedIds((prev) => new Set([...prev, item.id]));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? "Ошибка покупки");
    } finally {
      setPurchasing(null);
    }
  }

  const categories = [
    { key: "all", label: "Все" },
    { key: "card_back", label: "🃏 Рубашки" },
    { key: "table_theme", label: "🎯 Столы" },
  ];

  const filteredItems = activeCategory === "all" ? items : items.filter((i) => i.type === activeCategory);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800 }}>🛒 Магазин</h2>

      {/* Categories */}
      <div style={{ display: "flex", gap: 8 }}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: activeCategory === cat.key ? "1px solid #22c55e" : "1px solid rgba(148,163,184,0.2)",
              background: activeCategory === cat.key ? "rgba(34,197,94,0.2)" : "rgba(15,23,42,0.5)",
              color: activeCategory === cat.key ? "#4ade80" : "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Items grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {filteredItems.map((item) => {
          const owned = ownedIds.has(item.id);
          const isLoading = purchasing === item.id;
          const rarityColor = RARITY_COLORS[item.rarity] ?? "#94a3b8";
          return (
            <div
              key={item.id}
              style={{
                borderRadius: 16,
                padding: 12,
                background: "rgba(15,23,42,0.65)",
                border: `1px solid ${owned ? "rgba(34,197,94,0.4)" : "rgba(148,163,184,0.15)"}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {item.isLimited && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background: "rgba(245,158,11,0.2)",
                    border: "1px solid rgba(245,158,11,0.4)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#f59e0b",
                  }}
                >
                  LIMITED
                </div>
              )}
              <div
                style={{
                  height: 60,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${rarityColor}22, ${rarityColor}11)`,
                  border: `1px solid ${rarityColor}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                {item.type === "card_back" ? "🃏" : item.type === "table_theme" ? "🎯" : "✨"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: rarityColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {item.rarity}
                </div>
                {item.description && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.description}</div>
                )}
              </div>
              {owned ? (
                <div
                  style={{
                    padding: "8px",
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#4ade80",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  ✓ Куплено
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePurchase(item)}
                  disabled={isLoading || purchasing !== null}
                  style={{
                    padding: "8px",
                    borderRadius: 10,
                    border: "none",
                    background: isLoading ? "rgba(148,163,184,0.2)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: isLoading ? "#64748b" : "#1c1008",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {isLoading ? "..." : (
                    <>
                      <span>🪙</span>
                      <span>{item.price}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
