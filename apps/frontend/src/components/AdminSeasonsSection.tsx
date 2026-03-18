import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchCosmeticsCatalog } from '../api/cosmetics';
import type { CosmeticItemDto } from 'shared';
import {
  createAdminSeason,
  createSeasonReward,
  deleteSeasonReward,
  fetchAdminSeasonsFull,
  fetchSeasonRewards,
  type AdminSeasonDto,
  type AdminSeasonRewardDto,
  updateAdminSeason,
  updateSeasonReward,
} from '../api/adminSeason';
import type { AdminBadgeDto } from '../api/adminBadges';
import { fetchAdminBadges } from '../api/adminBadges';

type SeasonFormMode = 'create' | 'edit';
type RewardFormMode = 'create' | 'edit';

interface SeasonFormState {
  id: string;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

interface RewardFormState {
  id: string;
  level: string;
  rewardType: 'soft' | 'cosmetic' | 'badge';
  amountSoft: string;
  cosmeticItemId: string;
  badgeId: string;
}

export function AdminSeasonsSection() {
  const token = useAuthStore((s) => s.accessToken);
  const [seasons, setSeasons] = useState<AdminSeasonDto[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<AdminSeasonRewardDto[]>([]);
  const [catalog, setCatalog] = useState<CosmeticItemDto[]>([]);
  const [badges, setBadges] = useState<AdminBadgeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [seasonMode, setSeasonMode] = useState<SeasonFormMode>('create');
  const [seasonSubmitting, setSeasonSubmitting] = useState(false);
  const [rewardMode, setRewardMode] = useState<RewardFormMode>('create');
  const [rewardSubmitting, setRewardSubmitting] = useState(false);

  const initialSeasonForm: SeasonFormState = useMemo(
    () => ({
      id: '',
      code: '',
      name: '',
      startsAt: '',
      endsAt: '',
      isActive: false,
    }),
    [],
  );
  const [seasonForm, setSeasonForm] = useState<SeasonFormState>(initialSeasonForm);

  const initialRewardForm: RewardFormState = useMemo(
    () => ({
      id: '',
      level: '',
      rewardType: 'soft',
      amountSoft: '',
      cosmeticItemId: '',
      badgeId: '',
    }),
    [],
  );
  const [rewardForm, setRewardForm] = useState<RewardFormState>(initialRewardForm);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [seasonRows, cosmetics, badgeRows] = await Promise.all([
          fetchAdminSeasonsFull(token),
          fetchCosmeticsCatalog(token),
          fetchAdminBadges(token),
        ]);
        if (!cancelled) {
          setSeasons(seasonRows);
          setCatalog(cosmetics);
          setBadges(badgeRows);
          const active = seasonRows.find((s) => s.isActive) ?? seasonRows[0] ?? null;
          setSelectedSeasonId(active ? active.id : null);
          if (active) {
            setRewardLoading(true);
            const rewardsData = await fetchSeasonRewards(active.id, token);
            if (!cancelled) setRewards(rewardsData);
          }
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить сезоны.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRewardLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedSeasonId) return;
    let cancelled = false;
    async function loadRewards() {
      setRewardLoading(true);
      setError(null);
      try {
        const data = await fetchSeasonRewards(selectedSeasonId as string, token);
        if (!cancelled) setRewards(data);
      } catch {
        if (!cancelled) setError('Не удалось загрузить награды сезона.');
      } finally {
        if (!cancelled) setRewardLoading(false);
      }
    }
    void loadRewards();
    return () => {
      cancelled = true;
    };
  }, [selectedSeasonId, token]);

  function startCreateSeason() {
    setSeasonMode('create');
    setSeasonForm(initialSeasonForm);
    setMessage(null);
    setError(null);
  }

  function startEditSeason(season: AdminSeasonDto) {
    setSeasonMode('edit');
    setSeasonForm({
      id: season.id,
      code: season.code,
      name: season.name,
      startsAt: season.startsAt.slice(0, 16),
      endsAt: season.endsAt ? season.endsAt.slice(0, 16) : '',
      isActive: season.isActive,
    });
    setMessage(null);
    setError(null);
  }

  async function handleSeasonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSeasonSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        code: seasonForm.code.trim(),
        name: seasonForm.name.trim(),
        startsAt: seasonForm.startsAt,
        endsAt: seasonForm.endsAt || null,
        isActive: seasonForm.isActive,
      };
      let updated: AdminSeasonDto;
      if (seasonMode === 'create') {
        updated = await createAdminSeason(payload, token);
      } else if (seasonForm.id) {
        updated = await updateAdminSeason(seasonForm.id, {
          name: payload.name,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          isActive: payload.isActive,
        }, token);
      } else {
        throw new Error('Нет выбранного сезона для редактирования');
      }
      setSeasons((prev) => {
        const idx = prev.findIndex((s) => s.id === updated.id);
        if (idx === -1) return [...prev, updated];
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
      if (updated.isActive) {
        setSeasons((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : { ...s, isActive: false })),
        );
      }
      setMessage(seasonMode === 'create' ? 'Сезон создан.' : 'Сезон обновлён.');
      if (seasonMode === 'create') {
        setSeasonForm(initialSeasonForm);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения сезона.';
      setError(msg);
    } finally {
      setSeasonSubmitting(false);
    }
  }

  async function handleMakeActive(season: AdminSeasonDto) {
    if (!token) return;
    try {
      const updated = await updateAdminSeason(
        season.id,
        { isActive: true },
        token,
      );
      setSeasons((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : { ...s, isActive: false })),
      );
      setSelectedSeasonId(updated.id);
    } catch {
      setError('Не удалось переключить активный сезон.');
    }
  }

  function startEditReward(reward: AdminSeasonRewardDto) {
    setRewardMode('edit');
    setRewardForm({
      id: reward.id,
      level: String(reward.level),
      rewardType: reward.rewardType,
      amountSoft:
        reward.rewardType === 'soft' && reward.amountSoft != null
          ? String(reward.amountSoft)
          : '',
      cosmeticItemId: reward.cosmeticItemId ?? '',
      badgeId: reward.badgeId ?? '',
    });
    setMessage(null);
    setError(null);
  }

  const cosmeticOptions = useMemo(() => catalog, [catalog]);

  function labelForReward(reward: AdminSeasonRewardDto) {
    if (reward.rewardType === 'soft') {
      return `${reward.amountSoft ?? 0} монет`;
    }
    if (reward.rewardType === 'cosmetic') {
      return `Косметика: ${reward.cosmeticItemId ?? ''}`;
    }
    if (reward.rewardType === 'badge') {
      const title = reward.badge?.title ?? reward.badge?.code ?? reward.badgeId ?? '';
      return `Бейдж: ${title}`;
    }
    return '';
  }

  async function handleRewardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedSeasonId) return;
    setRewardSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const level = rewardForm.level !== '' ? Number(rewardForm.level) : NaN;
      const payload = {
        level,
        rewardType: rewardForm.rewardType,
        amountSoft:
          rewardForm.rewardType === 'soft' && rewardForm.amountSoft !== ''
            ? Number(rewardForm.amountSoft)
            : null,
        cosmeticItemId:
          rewardForm.rewardType === 'cosmetic' ? rewardForm.cosmeticItemId || null : null,
        badgeId: rewardForm.rewardType === 'badge' ? rewardForm.badgeId || null : null,
      };
      let updated: AdminSeasonRewardDto;
      if (rewardMode === 'create') {
        updated = await createSeasonReward(selectedSeasonId, payload as Required<typeof payload>, token);
        setRewards((prev) => [...prev, updated].sort((a, b) => a.level - b.level));
      } else if (rewardForm.id) {
        updated = await updateSeasonReward(selectedSeasonId, rewardForm.id, payload, token);
        setRewards((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => a.level - b.level),
        );
      } else {
        throw new Error('Нет выбранной награды для редактирования');
      }
      setMessage(rewardMode === 'create' ? 'Награда добавлена.' : 'Награда обновлена.');
      if (rewardMode === 'create') {
        setRewardForm(initialRewardForm);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения награды.';
      setError(msg);
    } finally {
      setRewardSubmitting(false);
    }
  }

  async function handleDeleteReward(reward: AdminSeasonRewardDto) {
    if (!token || !selectedSeasonId) return;
    try {
      await deleteSeasonReward(selectedSeasonId, reward.id, token);
      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    } catch {
      setError('Не удалось удалить награду.');
    }
  }

  const activeSeason = seasons.find((s) => s.isActive) ?? null;

  return (
    <section className="space-y-3 mt-4" aria-label="Админ: сезоны">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Seasons</h2>
        <button
          type="button"
          className="px-2 py-1 rounded bg-gray-700 text-xs"
          onClick={startCreateSeason}
        >
          Новый сезон
        </button>
      </div>
      {loading && <p className="text-xs text-gray-400">Загрузка сезонов…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      {seasons.length === 0 && !loading && !error && (
        <p className="text-xs text-gray-400">Сезоны ещё не настроены.</p>
      )}

      {seasons.length > 0 && (
        <div className="space-y-1 text-[11px]" aria-label="Список сезонов">
          {seasons.map((season) => (
            <div
              key={season.id}
              className={`flex items-center justify-between rounded px-3 py-2 ${
                season.isActive
                  ? 'bg-emerald-900/60'
                  : 'bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)]'
              }`}
            >
              <div className="flex-1 mr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{season.code}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-700 text-[10px]">
                    {season.name}
                  </span>
                  {season.isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-[10px]">
                      active
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() => {
                    setSelectedSeasonId(season.id);
                    startEditSeason(season);
                  }}
                >
                  Редактировать
                </button>
                {!season.isActive && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                    onClick={() => void handleMakeActive(season)}
                  >
                    Сделать активным
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSeasonSubmit}
        className="mt-3 space-y-2 text-[11px]"
        aria-label="Форма сезона"
      >
        <h3 className="text-xs font-semibold">
          {seasonMode === 'create'
            ? 'Создать новый сезон'
            : `Редактировать сезон: ${seasonForm.code}`}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span>Code</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={seasonForm.code}
              onChange={(e) => setSeasonForm((f) => ({ ...f, code: e.target.value }))}
              disabled={seasonMode === 'edit'}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Name</span>
            <input
              className="rounded bg-gray-800 px-2 py-1"
              value={seasonForm.name}
              onChange={(e) => setSeasonForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Starts at</span>
            <input
              type="datetime-local"
              className="rounded bg-gray-800 px-2 py-1"
              value={seasonForm.startsAt}
              onChange={(e) => setSeasonForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span>Ends at</span>
            <input
              type="datetime-local"
              className="rounded bg-gray-800 px-2 py-1"
              value={seasonForm.endsAt}
              onChange={(e) => setSeasonForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
          </label>
        </div>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={seasonForm.isActive}
            onChange={(e) => setSeasonForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          <span>Сделать активным</span>
        </label>
        <button
          type="submit"
          className="mt-2 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
          disabled={seasonSubmitting}
        >
          {seasonSubmitting
            ? 'Сохранение…'
            : seasonMode === 'create'
              ? 'Создать сезон'
              : 'Сохранить сезон'}
        </button>
      </form>

      {selectedSeasonId && (
        <section className="mt-4 space-y-2" aria-label="Reward track">
          <h3 className="text-xs font-semibold">
            Награды сезона {activeSeason?.code ?? ''}
          </h3>
          {rewardLoading && <p className="text-xs text-gray-400">Загрузка наград…</p>}
          {!rewardLoading && rewards.length === 0 && (
            <p className="text-xs text-gray-400">Награды пока не настроены.</p>
          )}
          {rewards.length > 0 && (
            <div className="space-y-1 text-[11px]" aria-label="Список наград сезона">
              {rewards.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2"
                >
                  <div className="flex-1 mr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Уровень {r.level}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-700 text-[10px]">
                        {r.rewardType}
                      </span>
                      <span className="text-gray-300">{labelForReward(r)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                      onClick={() => startEditReward(r)}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                      onClick={() => void handleDeleteReward(r)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleRewardSubmit}
            className="mt-3 space-y-2 text-[11px]"
            aria-label="Форма награды сезона"
          >
            <h4 className="text-xs font-semibold">
              {rewardMode === 'create'
                ? 'Добавить награду'
                : `Редактировать награду уровня ${rewardForm.level}`}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5">
                <span>Level</span>
                <input
                  className="rounded bg-gray-800 px-2 py-1"
                  value={rewardForm.level}
                  onChange={(e) => setRewardForm((f) => ({ ...f, level: e.target.value }))}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span>Type</span>
                <select
                  className="rounded bg-gray-800 px-2 py-1"
                  value={rewardForm.rewardType}
                  onChange={(e) =>
                    setRewardForm((f) => ({
                      ...f,
                      rewardType: e.target.value as RewardFormState['rewardType'],
                    }))
                  }
                >
                  <option value="soft">soft</option>
                  <option value="cosmetic">cosmetic</option>
                  <option value="badge">badge</option>
                </select>
              </label>
              {rewardForm.rewardType === 'soft' && (
                <label className="flex flex-col gap-0.5">
                  <span>Soft amount</span>
                  <input
                    className="rounded bg-gray-800 px-2 py-1"
                    value={rewardForm.amountSoft}
                    onChange={(e) =>
                      setRewardForm((f) => ({ ...f, amountSoft: e.target.value }))
                    }
                    inputMode="numeric"
                  />
                </label>
              )}
              {rewardForm.rewardType === 'cosmetic' && (
                <label className="flex flex-col gap-0.5">
                  <span>Cosmetic item</span>
                  <select
                    className="rounded bg-gray-800 px-2 py-1"
                    value={rewardForm.cosmeticItemId}
                    onChange={(e) =>
                      setRewardForm((f) => ({ ...f, cosmeticItemId: e.target.value }))
                    }
                  >
                    <option value="">Выберите предмет</option>
                    {cosmeticOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {rewardForm.rewardType === 'badge' && (
                <label className="flex flex-col gap-0.5">
                  <span>Badge</span>
                  <select
                    className="rounded bg-gray-800 px-2 py-1"
                    value={rewardForm.badgeId}
                    onChange={(e) =>
                      setRewardForm((f) => ({ ...f, badgeId: e.target.value }))
                    }
                  >
                    <option value="">Выберите бейдж</option>
                    {badges.length === 0 && (
                      <option value="" disabled>
                        Бейджи не найдены
                      </option>
                    )}
                    {badges.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.title} ({badge.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              type="submit"
              className="mt-2 px-3 py-1 rounded bg-emerald-600 text-xs disabled:opacity-60"
              disabled={rewardSubmitting}
            >
              {rewardSubmitting
                ? 'Сохранение…'
                : rewardMode === 'create'
                  ? 'Добавить награду'
                  : 'Сохранить награду'}
            </button>
          </form>
        </section>
      )}
    </section>
  );
}

