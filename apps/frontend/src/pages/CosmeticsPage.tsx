import { useEffect, useState } from 'react';
import type { CosmeticItemDto, PlayerInventoryDto, WalletDto, StoreOfferDto } from 'shared';
import { useAuthStore } from '../store/authStore';
import {
  fetchCosmeticsCatalog,
  fetchMyInventory,
  equipCosmetic,
} from '../api/cosmetics';
import { fetchMyWallet } from '../api/wallet';
import { fetchStoreOffers, purchaseOffer } from '../api/store';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function CosmeticsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [catalog, setCatalog] = useState<CosmeticItemDto[]>([]);
  const [offers, setOffers] = useState<StoreOfferDto[]>([]);
  const [inventory, setInventory] = useState<PlayerInventoryDto | null>(null);
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const [storeOffers, cat, inv, wal] = await Promise.all([
          fetchStoreOffers(token ?? null),
          fetchCosmeticsCatalog(token ?? null),
          fetchMyInventory(token ?? null),
          fetchMyWallet(token ?? null),
        ]);
        if (!cancelled) {
          setOffers(storeOffers);
          setCatalog(cat);
          setInventory(inv);
          setWallet(wal);
          setStatus('loaded');
        }
      } catch (e) {
        if (!cancelled) {
          setError('Не удалось загрузить магазин. Попробуйте позже.');
          setStatus('error');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="p-4 text-sm">
        <h1 className="text-lg font-semibold mb-2">Магазин</h1>
        <p>Для доступа к магазину нужно войти в игру.</p>
      </div>
    );
  }

  const ownedIds = new Set(inventory?.ownedItems.map((o) => o.itemId) ?? []);
  const equipped = inventory?.equippedItems ?? {};

  const visibleOffers = offers
    .map((offer) => {
      const cosmeticGrant = offer.grants.find(
        (g): g is { type: 'cosmetic'; itemId: string } =>
          g.type === 'cosmetic' && typeof g.itemId === 'string',
      );
      if (!cosmeticGrant) return null;
      const item = catalog.find((c) => c.id === cosmeticGrant.itemId);
      if (!item) return null;
      return { offer, item };
    })
    .filter((x): x is { offer: StoreOfferDto; item: CosmeticItemDto } => x !== null);

  async function handlePurchase(offer: StoreOfferDto, item: CosmeticItemDto) {
    setError(null);
    setActionMessage(null);
    try {
      const result = await purchaseOffer(offer.id, token);
      setInventory(result.inventory);
      setWallet(result.wallet);
      setActionMessage(`Куплено: ${item.name}`);
    } catch (e) {
      const msg = e && typeof (e as Error).message === 'string' ? (e as Error).message : '';
      if (msg.toLowerCase().includes('insufficient')) {
        setError('Недостаточно монет для покупки.');
      } else if (msg.toLowerCase().includes('already owned')) {
        setError('Предмет уже находится в инвентаре.');
      } else {
        setError('Не удалось выполнить покупку.');
      }
    }
  }

  async function handleEquip(item: CosmeticItemDto) {
    if (!inventory) return;
    setError(null);
    setActionMessage(null);
    try {
      const updated = await equipCosmetic(item.slot, item.id, token);
      setInventory(updated);
      setActionMessage(`Экипировано: ${item.name}`);
    } catch {
      setError('Не удалось экипировать предмет.');
    }
  }

  return (
    <div className="p-4 text-sm space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold">Магазин косметики</h1>
        {wallet && (
          <div
            aria-label="Баланс кошелька"
            className="flex items-center gap-1 rounded-full bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-1 text-[11px]"
          >
            <span className="opacity-80">Баланс</span>
            <span className="font-semibold">{wallet.balance}</span>
            <span className="opacity-80">монет</span>
          </div>
        )}
      </div>
      {status === 'loading' && <p>Загрузка магазина…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {actionMessage && <p className="text-emerald-400">{actionMessage}</p>}
      {status === 'loaded' && visibleOffers.length === 0 && <p>Каталог пока пуст.</p>}

      {status === 'loaded' && visibleOffers.length > 0 && (
        <div className="space-y-2" aria-label="Каталог косметики">
          {visibleOffers.map(({ offer, item }) => {
            const owned = ownedIds.has(item.id);
            const isEquipped =
              Object.values(equipped).find((id) => id === item.id) !== undefined;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium">{item.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        item.rarity === 'legendary'
                          ? 'border-yellow-400 text-yellow-300'
                          : item.rarity === 'epic'
                            ? 'border-purple-400 text-purple-300'
                            : item.rarity === 'rare'
                              ? 'border-sky-400 text-sky-300'
                              : 'border-gray-500 text-gray-300'
                      }`}
                    >
                      {item.rarity === 'legendary'
                        ? 'Легендарный'
                        : item.rarity === 'epic'
                          ? 'Эпический'
                          : item.rarity === 'rare'
                            ? 'Редкий'
                            : 'Обычный'}
                    </span>
                    {isEquipped && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/70">
                        Экипировано
                      </span>
                    )}
                    {owned && !isEquipped && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-600/70">
                        В инвентаре
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-gray-300 mt-0.5">{item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                    {item.isExclusive && (
                      <span className="px-1.5 py-0.5 rounded bg-fuchsia-700/70 text-fuchsia-100">
                        Эксклюзив
                      </span>
                    )}
                    {item.isLimited && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-700/70 text-amber-100">
                        Лимитированный
                      </span>
                    )}
                    {item.seasonId && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-700/70 text-indigo-100">
                        Сезонный
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Цена:{' '}
                    {offer.priceSoft && offer.priceSoft > 0
                      ? `${offer.priceSoft} монет`
                      : 'бесплатно'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  {!owned && (offer.priceSoft ?? 0) >= 0 && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-emerald-600 text-xs"
                      onClick={() => void handlePurchase(offer, item)}
                    >
                      {offer.priceSoft && offer.priceSoft > 0 ? 'Купить' : 'Получить'}
                    </button>
                  )}
                  {owned && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-sky-600 text-xs"
                      onClick={() => void handleEquip(item)}
                    >
                      {isEquipped ? 'Снять' : 'Экипировать'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

