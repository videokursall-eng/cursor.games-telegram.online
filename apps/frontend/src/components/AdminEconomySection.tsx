import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  adminCreditWallet,
  adminGrantItem,
  fetchAdminInventory,
  fetchAdminWallet,
} from '../api/adminEconomy';
import { fetchAdminCosmetics, type AdminCosmeticItem } from '../api/adminCosmetics';
import type { PlayerInventoryDto, WalletDto, CurrencyTransactionDto } from 'shared';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function AdminEconomySection() {
  const token = useAuthStore((s) => s.accessToken);
  const [userId, setUserId] = useState('');
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [inventory, setInventory] = useState<PlayerInventoryDto | null>(null);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [grantItemId, setGrantItemId] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [softAmount, setSoftAmount] = useState('');
  const [softReason, setSoftReason] = useState('admin_adjustment');

  const [catalog, setCatalog] = useState<AdminCosmeticItem[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<LoadState>('idle');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadCatalog() {
      setCatalogStatus('loading');
      setCatalogError(null);
      try {
        const items = await fetchAdminCosmetics(token);
        if (!cancelled) {
          setCatalog(items);
          setCatalogStatus('loaded');
        }
      } catch {
        if (!cancelled) {
          setCatalogStatus('error');
          setCatalogError('Не удалось загрузить каталог косметики.');
        }
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filteredCatalog = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((item) => {
      const haystack = `${item.title} ${item.code}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [catalog, catalogFilter]);

  const selectedItem = useMemo(
    () => catalog.find((i) => i.id === grantItemId) ?? null,
    [catalog, grantItemId],
  );

  if (!token) return null;

  async function handleLoad() {
    if (!userId.trim()) {
      setError('Нужно указать userId.');
      return;
    }
    setStatus('loading');
    setError(null);
    setMessage(null);
    try {
      const [w, inv] = await Promise.all([
        fetchAdminWallet(userId.trim(), token),
        fetchAdminInventory(userId.trim(), token),
      ]);
      setWallet(w);
      setInventory(inv);
      setStatus('loaded');
    } catch {
      setStatus('error');
      setError('Не удалось загрузить данные игрока.');
    }
  }

  async function handleGrantItem(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !grantItemId.trim() || !grantReason.trim()) {
      setError('userId, itemId и reason обязательны.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const inv = await adminGrantItem(
        {
          userId: userId.trim(),
          itemId: grantItemId.trim(),
          reason: grantReason.trim(),
        },
        token,
      );
      setInventory(inv);
      setMessage('Предмет выдан игроку.');
    } catch {
      setError('Не удалось выдать предмет.');
    }
  }

  async function handleCreditSoft(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(softAmount);
    if (!userId.trim() || !softReason.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Нужно указать положительную сумму и reason.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await adminCreditWallet(
        {
          userId: userId.trim(),
          amount,
          // тип reason совпадает с CurrencyTransactionDto['reason']; для UI используем строку.
          reason: softReason as unknown as CurrencyTransactionDto['reason'],
        },
        token,
      );
      setWallet(res.wallet);
      setMessage('Баланс обновлён.');
    } catch {
      setError('Не удалось начислить валюту.');
    }
  }

  return (
    <section className="space-y-3 mt-4" aria-label="Админ: экономика">
      <h2 className="text-sm font-semibold">Economy / Inventory</h2>
      <p className="text-xs text-gray-400">
        Ручные операции для поддержки игроков. Все действия требуют указать причину и не влияют на
        силу в матче.
      </p>

      <div className="space-y-2 text-[11px]">
        <label className="flex flex-col gap-0.5">
          <span>User ID</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-700 text-xs"
          onClick={() => void handleLoad()}
        >
          Загрузить кошелёк и инвентарь
        </button>
      </div>

      {status === 'loading' && <p className="text-xs text-gray-400">Загрузка…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      {wallet && (
        <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2 text-[11px]">
          <div className="text-gray-400 mb-1">Кошелёк</div>
          <div className="flex justify-between">
            <span>Баланс (soft)</span>
            <span className="font-semibold">{wallet.balance}</span>
          </div>
        </div>
      )}

      {inventory && (
        <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2 text-[11px]">
          <div className="text-gray-400 mb-1">Инвентарь</div>
          {inventory.ownedItems.length === 0 && <p className="text-gray-400">Предметов нет.</p>}
          {inventory.ownedItems.length > 0 && (
            <ul className="space-y-0.5 max-h-32 overflow-auto">
              {inventory.ownedItems.map((it) => (
                <li key={`${it.itemId}-${it.acquiredAt}`} className="flex justify-between">
                  <span>{it.itemId}</span>
                  <span className="text-gray-400 text-[10px]">{it.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        aria-label="Ручная выдача предмета"
        className="mt-2 space-y-2 text-[11px]"
        onSubmit={handleGrantItem}
      >
        <h3 className="text-xs font-semibold">Выдать косметический предмет</h3>
        <label className="flex flex-col gap-0.5">
          <span>Поиск по названию/коду</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={catalogFilter}
            onChange={(e) => setCatalogFilter(e.target.value)}
            placeholder="Например: шляпа / hat_red"
            aria-label="Поиск косметики"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span>Cosmetic item</span>
          <select
            className="rounded bg-gray-800 px-2 py-1"
            aria-label="Cosmetic item"
            value={grantItemId}
            onChange={(e) => setGrantItemId(e.target.value)}
            disabled={catalogStatus !== 'loaded' || catalog.length === 0}
          >
            <option value="">
              {catalogStatus === 'loading'
                ? 'Загрузка каталога...'
                : catalog.length === 0
                  ? 'Каталог пуст'
                  : 'Выберите предмет'}
            </option>
            {catalogStatus === 'loaded' &&
              filteredCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.code}) • {item.rarity} • {item.slot}{' '}
                  {item.isActive ? '• active' : '• inactive'}
                </option>
              ))}
          </select>
        </label>
        {catalogError && (
          <p className="text-xs text-red-400">{catalogError}</p>
        )}
        {selectedItem && (
          <p className="text-[10px] text-gray-400">
            Выбрано: {selectedItem.title} ({selectedItem.code}), rarity {selectedItem.rarity}
          </p>
        )}
        <label className="flex flex-col gap-0.5">
          <span>Reason (audit)</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="mt-1 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
          disabled={!userId.trim() || !grantItemId.trim()}
        >
          Выдать предмет
        </button>
      </form>

      <form
        aria-label="Ручное начисление валюты"
        className="mt-2 space-y-2 text-[11px]"
        onSubmit={handleCreditSoft}
      >
        <h3 className="text-xs font-semibold">Начислить мягкую валюту</h3>
        <label className="flex flex-col gap-0.5">
          <span>Сумма (soft)</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            inputMode="numeric"
            value={softAmount}
            onChange={(e) => setSoftAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span>Reason (audit)</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={softReason}
            onChange={(e) => setSoftReason(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="mt-1 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
          disabled={!userId.trim()}
        >
          Начислить валюту
        </button>
      </form>
    </section>
  );
}

