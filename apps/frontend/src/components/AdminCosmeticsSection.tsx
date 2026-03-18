import { useEffect, useMemo, useState } from 'react';
import type { CosmeticRarity } from 'shared';
import { useAuthStore } from '../store/authStore';
import {
  createAdminCosmetic,
  fetchAdminCosmetics,
  fetchAdminSeasons,
  setAdminCosmeticActive,
  updateAdminCosmetic,
  type AdminCosmeticItem,
  type AdminSeasonSummary,
} from '../api/adminCosmetics';

type FormMode = 'create' | 'edit';

const rarityOptions: { value: CosmeticRarity; label: string }[] = [
  { value: 'common', label: 'Обычный' },
  { value: 'rare', label: 'Редкий' },
  { value: 'epic', label: 'Эпический' },
  { value: 'legendary', label: 'Легендарный' },
];

const slotOptions = [
  { value: 'avatar', label: 'Аватар' },
  { value: 'avatar_frame', label: 'Рамка аватара' },
  { value: 'card_back', label: 'Рубашка карт' },
  { value: 'table_theme', label: 'Стол' },
  { value: 'emote', label: 'Эмоция' },
];

export function AdminCosmeticsSection() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<AdminCosmeticItem[]>([]);
  const [seasons, setSeasons] = useState<AdminSeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const initialFormState = useMemo(
    () => ({
      code: '',
      type: 'avatar',
      title: '',
      description: '',
      icon: '',
      priceSoft: '',
      priceStars: '',
      rarity: 'common' as CosmeticRarity,
      isExclusive: false,
      isLimited: false,
      seasonId: '',
      isActive: true,
    }),
    [],
  );

  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [cosmetics, seasonsList] = await Promise.all([
          fetchAdminCosmetics(token),
          fetchAdminSeasons(token),
        ]);
        if (!cancelled) {
          setItems(cosmetics);
          setSeasons(seasonsList);
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить каталог косметики.');
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
    setFormMode('create');
    setEditingCode(null);
    setForm(initialFormState);
    setMessage(null);
    setError(null);
  }

  function startEdit(item: AdminCosmeticItem) {
    setFormMode('edit');
    setEditingCode(item.code);
    setForm({
      code: item.code,
      type: item.slot,
      title: item.title,
      description: item.description ?? '',
      icon: item.icon ?? '',
      priceSoft: item.priceSoft != null ? String(item.priceSoft) : '',
      priceStars: item.priceStars != null ? String(item.priceStars) : '',
      rarity: item.rarity,
      isExclusive: item.isExclusive,
      isLimited: item.isLimited,
      seasonId: item.seasonId ?? '',
      isActive: item.isActive,
    });
    setMessage(null);
    setError(null);
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
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        priceSoft: form.priceSoft !== '' ? Number(form.priceSoft) : null,
        priceStars: form.priceStars !== '' ? Number(form.priceStars) : null,
        rarity: form.rarity,
        isExclusive: form.isExclusive,
        isLimited: form.isLimited,
        seasonId: form.seasonId || null,
      };
      let updated: AdminCosmeticItem;
      if (formMode === 'create') {
        updated = await createAdminCosmetic(payload, token);
      } else if (editingCode) {
        updated = await updateAdminCosmetic(editingCode, payload, token);
      } else {
        throw new Error('Нет выбранного элемента для редактирования');
      }
      // sync active flag if changed via form
      if (updated) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.code === updated.code);
          if (idx === -1) return [...prev, updated];
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        });
      }
      setMessage(formMode === 'create' ? 'Предмет создан.' : 'Предмет обновлён.');
      if (formMode === 'create') {
        setForm(initialFormState);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: AdminCosmeticItem) {
    if (!token) return;
    try {
      const updated = await setAdminCosmeticActive(item.code, !item.isActive, token);
      setItems((prev) => prev.map((i) => (i.code === updated.code ? updated : i)));
    } catch {
      setError('Не удалось изменить активность предмета.');
    }
  }

  return (
    <section className="space-y-3 mt-3" aria-label="Админ: косметика">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Каталог косметики</h2>
        <button
          type="button"
          className="px-2 py-1 rounded bg-gray-700 text-xs"
          onClick={startCreate}
        >
          Новый предмет
        </button>
      </div>
      {loading && <p className="text-xs text-gray-400">Загрузка каталога…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      {items.length > 0 && (
        <div className="space-y-1 text-[11px]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2"
            >
              <div className="flex-1 mr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-gray-400">({item.code})</span>
                  <span className="px-1.5 py-0.5 rounded border border-gray-500 text-[10px]">
                    {item.slot}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] ${
                      item.rarity === 'legendary'
                        ? 'border-yellow-400 text-yellow-300'
                        : item.rarity === 'epic'
                          ? 'border-purple-400 text-purple-300'
                          : item.rarity === 'rare'
                            ? 'border-sky-400 text-sky-300'
                            : 'border-gray-500 text-gray-300'
                    }`}
                  >
                    {item.rarity}
                  </span>
                  {item.isExclusive && (
                    <span className="px-1.5 py-0.5 rounded bg-fuchsia-700/70 text-fuchsia-100">
                      exclusive
                    </span>
                  )}
                  {item.isLimited && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-700/70 text-amber-100">
                      limited
                    </span>
                  )}
                  {item.seasonId && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-700/70 text-indigo-100">
                      season
                    </span>
                  )}
                  {!item.isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-red-700/70 text-red-100">
                      inactive
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-[10px] text-gray-400">{item.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() => startEdit(item)}
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() => void toggleActive(item)}
                >
                  {item.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2 text-[11px]" aria-label="Форма косметики">
        <h3 className="text-xs font-semibold">
          {formMode === 'create' ? 'Создать новый предмет' : `Редактировать: ${form.code}`}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span>Code</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={formMode === 'edit'}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Type</span>
            <select
              className="rounded bg-gray-800 px-2 py-1"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {slotOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Название</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Иконка (URL)</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5 col-span-2">
            <span>Описание</span>
            <textarea
              className="rounded bg-gray-800 px-2 py-1"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Цена (soft)</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.priceSoft}
              onChange={(e) => setForm((f) => ({ ...f, priceSoft: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Цена (Stars)</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={form.priceStars}
              onChange={(e) => setForm((f) => ({ ...f, priceStars: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Редкость</span>
            <select
              className="rounded bg-gray-800 px-2 py-1"
              value={form.rarity}
              onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as CosmeticRarity }))}
            >
              {rarityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Сезон</span>
            <select
              className="rounded bg-gray-800 px-2 py-1"
              value={form.seasonId}
              onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}
            >
              <option value="">Без сезона</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={form.isExclusive}
              onChange={(e) => setForm((f) => ({ ...f, isExclusive: e.target.checked }))}
            />
            <span>Эксклюзив</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={form.isLimited}
              onChange={(e) => setForm((f) => ({ ...f, isLimited: e.target.checked }))}
            />
            <span>Лимитированный</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              disabled
            />
            <span className="text-gray-500">Активен (меняется кнопкой в списке)</span>
          </label>
        </div>
        <button
          type="submit"
          className="mt-2 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Сохранение…' : formMode === 'create' ? 'Создать' : 'Сохранить'}
        </button>
      </form>
    </section>
  );
}

