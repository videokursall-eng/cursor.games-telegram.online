import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import type { AdminCosmeticItem } from '../api/adminCosmetics';
import { fetchAdminCosmetics } from '../api/adminCosmetics';
import {
  createAdminOffer,
  fetchAdminOffers,
  toggleAdminOfferActive,
  updateAdminOffer,
  type AdminOfferDto,
} from '../api/adminOffers';

type OfferFormMode = 'create' | 'edit';

interface OfferFormState {
  id: string;
  code: string;
  itemId: string;
  priceSoft: string;
  priceStars: string;
  currencyType: 'soft' | 'stars';
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}

export function AdminOffersSection() {
  const token = useAuthStore((s) => s.accessToken);
  const [offers, setOffers] = useState<AdminOfferDto[]>([]);
  const [catalog, setCatalog] = useState<AdminCosmeticItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<OfferFormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialForm: OfferFormState = useMemo(
    () => ({
      id: '',
      code: '',
      itemId: '',
      priceSoft: '',
      priceStars: '',
      currencyType: 'soft',
      isActive: true,
      sortOrder: '0',
      startsAt: '',
      endsAt: '',
    }),
    [],
  );
  const [form, setForm] = useState<OfferFormState>(initialForm);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [offersData, cosmetics] = await Promise.all([
          fetchAdminOffers(token),
          fetchAdminCosmetics(token),
        ]);
        if (!cancelled) {
          setOffers(offersData);
          setCatalog(cosmetics);
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить офферы магазина.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function startCreate() {
    setMode('create');
    setEditingId(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  function startEdit(offer: AdminOfferDto) {
    setMode('edit');
    setEditingId(offer.id);
    setForm({
      id: offer.id,
      code: offer.code,
      itemId: offer.itemId,
      priceSoft: offer.priceSoft != null ? String(offer.priceSoft) : '',
      priceStars: offer.priceStars != null ? String(offer.priceStars) : '',
      currencyType: offer.currencyType,
      isActive: offer.isActive,
      sortOrder: String(offer.sortOrder),
      startsAt: offer.startsAt ?? '',
      endsAt: offer.endsAt ?? '',
    });
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        code: form.code.trim(),
        itemId: form.itemId,
        priceSoft: form.priceSoft !== '' ? Number(form.priceSoft) : null,
        priceStars: form.priceStars !== '' ? Number(form.priceStars) : null,
        currencyType: form.currencyType,
        isActive: form.isActive,
        sortOrder: form.sortOrder !== '' ? Number(form.sortOrder) : 0,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      let updated: AdminOfferDto;
      if (mode === 'create') {
        updated = await createAdminOffer(payload, token);
      } else if (editingId) {
        updated = await updateAdminOffer(editingId, payload, token);
      } else {
        throw new Error('Нет выбранного оффера для редактирования');
      }
      setOffers((prev) => {
        const idx = prev.findIndex((o) => o.id === updated.id);
        if (idx === -1) return [...prev, updated];
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
      setMessage(mode === 'create' ? 'Оффер создан.' : 'Оффер обновлён.');
      if (mode === 'create') {
        setForm(initialForm);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения оффера.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(offer: AdminOfferDto) {
    if (!token) return;
    try {
      const updated = await toggleAdminOfferActive(offer.id, !offer.isActive, token);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch {
      setError('Не удалось изменить активность оффера.');
    }
  }

  function labelForItemId(itemId: string) {
    const item = catalog.find((c) => c.id === itemId || c.code === itemId);
    return item ? `${item.title} (${item.code})` : itemId;
  }

  return (
    <section className="space-y-3 mt-4" aria-label="Админ: офферы">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Store Offers</h2>
        <button
          type="button"
          className="px-2 py-1 rounded bg-gray-700 text-xs"
          onClick={startCreate}
        >
          Новый оффер
        </button>
      </div>
      {loading && <p className="text-xs text-gray-400">Загрузка офферов…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      {offers.length === 0 && !loading && !error && (
        <p className="text-xs text-gray-400">Пока нет офферов.</p>
      )}

      {offers.length > 0 && (
        <div className="space-y-1 text-[11px]" aria-label="Список офферов">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="flex items-center justify-between rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2"
            >
              <div className="flex-1 mr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{offer.code}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-700 text-[10px]">
                    {labelForItemId(offer.itemId)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-gray-600 text-[10px]">
                    {offer.currencyType === 'soft' ? 'Soft' : 'Stars'}
                  </span>
                  <span className="text-gray-300">
                    soft: {offer.priceSoft ?? 0} · stars: {offer.priceStars ?? 0}
                  </span>
                  <span className="text-gray-400">sort: {offer.sortOrder}</span>
                  {offer.startsAt && (
                    <span className="text-gray-400">
                      c {new Date(offer.startsAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                  {offer.endsAt && (
                    <span className="text-gray-400">
                      по {new Date(offer.endsAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                  {!offer.isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-red-700/70 text-red-100">
                      inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() => startEdit(offer)}
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() => void handleToggleActive(offer)}
                >
                  {offer.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-3 space-y-2 text-[11px]"
        aria-label="Форма оффера"
      >
        <h3 className="text-xs font-semibold">
          {mode === 'create' ? 'Создать новый оффер' : `Редактировать оффер: ${form.code}`}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span>Code</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={mode === 'edit'}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Item</span>
            <select
              className="rounded bg-gray-800 px-2 py-1"
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
            >
              <option value="">Выберите предмет</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.code})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Цена soft</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.priceSoft}
              onChange={(e) => setForm((f) => ({ ...f, priceSoft: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Цена Stars</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.priceStars}
              onChange={(e) => setForm((f) => ({ ...f, priceStars: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Валюта</span>
            <select
              className="rounded bg-gray-800 px-2 py-1"
              value={form.currencyType}
              onChange={(e) =>
                setForm((f) => ({ ...f, currencyType: e.target.value as 'soft' | 'stars' }))
              }
            >
              <option value="soft">Soft</option>
              <option value="stars">Stars</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Sort order</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Starts at</span>
            <input
              type="datetime-local"
              className="rounded bg-gray-800 px-2 py-1"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Ends at</span>
            <input
              type="datetime-local"
              className="rounded bg-gray-800 px-2 py-1"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
          </label>
        </div>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          <span>Активен</span>
        </label>
        <button
          type="submit"
          className="mt-2 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Сохранение…' : mode === 'create' ? 'Создать оффер' : 'Сохранить оффер'}
        </button>
      </form>
    </section>
  );
}

