import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchAdminStatsOverview, type AdminStatsOverview } from '../api/adminStats';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function AdminStatsSection() {
  const token = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const data = await fetchAdminStatsOverview(token);
        if (!cancelled) {
          setStats(data);
          setStatus('loaded');
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить статистику.');
          setStatus('error');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return null;

  return (
    <section className="space-y-3 mt-4" aria-label="Админ: статистика">
      <h2 className="text-sm font-semibold">Statistics</h2>
      {status === 'loading' && <p className="text-xs text-gray-400">Загрузка статистики…</p>}
      {status === 'error' && error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {status === 'loaded' && stats && (
        <>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">Всего матчей</div>
              <div className="text-lg font-semibold">{stats.matchesTotal}</div>
            </div>
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">DAU</div>
              <div className="text-lg font-semibold">{stats.dau}</div>
            </div>
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">MAU</div>
              <div className="text-lg font-semibold">{stats.mau}</div>
            </div>
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">Активные игроки</div>
              <div className="text-lg font-semibold">{stats.activePlayers}</div>
            </div>
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">Покупок всего</div>
              <div className="text-lg font-semibold">{stats.purchasesTotal}</div>
            </div>
            <div className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2">
              <div className="text-gray-400">Новых игроков (7д)</div>
              <div className="text-lg font-semibold">{stats.newPlayersLast7d}</div>
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <h3 className="text-xs font-semibold mb-1">Матчи по режимам</h3>
              {stats.matchesByMode.length === 0 && (
                <p className="text-gray-400">Нет данных по режимам.</p>
              )}
              {stats.matchesByMode.length > 0 && (
                <ul className="space-y-0.5">
                  {stats.matchesByMode.map((m) => (
                    <li key={m.mode} className="flex justify-between">
                      <span className="text-gray-300">{m.mode}</span>
                      <span className="font-semibold">{m.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold mb-1">Топ косметики по покупкам</h3>
              {stats.topCosmetics.length === 0 && (
                <p className="text-gray-400">Покупок ещё не было.</p>
              )}
              {stats.topCosmetics.length > 0 && (
                <ul className="space-y-0.5">
                  {stats.topCosmetics.map((c) => (
                    <li key={c.itemId} className="flex justify-between">
                      <span className="text-gray-300">{c.itemId}</span>
                      <span className="font-semibold">{c.purchases}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold mb-1">Клеймы по сезонам</h3>
              {stats.seasonClaims.length === 0 && (
                <p className="text-gray-400">Награды сезона ещё не клеймились.</p>
              )}
              {stats.seasonClaims.length > 0 && (
                <ul className="space-y-0.5">
                  {stats.seasonClaims.map((s) => (
                    <li key={s.seasonId} className="flex justify-between">
                      <span className="text-gray-300">{s.seasonId}</span>
                      <span className="font-semibold">{s.claims}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

