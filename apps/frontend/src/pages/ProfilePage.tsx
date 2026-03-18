import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchMyProfile, type PlayerProfileWithStatsDto } from '../api/profile';
import { SeasonRewards } from '../components/SeasonRewards';

export function ProfilePage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<PlayerProfileWithStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!token) {
      setError('Требуется авторизация');
      setLoading(false);
      return;
    }
    fetchMyProfile(token)
      .then((res) => {
        if (!active) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message || 'Ошибка загрузки профиля');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-screen">
        <p className="text-sm text-gray-300">Загрузка профиля…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-screen space-y-3">
        <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>
        <button
          type="button"
          className="rounded bg-gray-800 px-4 py-2 text-sm"
          onClick={() => navigate('/')}
        >
          В лобби
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-screen space-y-3">
        <p className="text-sm text-gray-300">Профиль не найден.</p>
        <button
          type="button"
          className="rounded bg-gray-800 px-4 py-2 text-sm"
          onClick={() => navigate('/')}
        >
          В лобби
        </button>
      </main>
    );
  }

  const { profile, stats, achievements } = data;
  const winRatePercent = stats.matchesPlayed > 0 ? Math.round(stats.winRate * 100) : 0;

  const avatarLetter = profile.displayName?.trim()?.[0]?.toUpperCase() ?? 'P';

  return (
    <main className="p-4 pb-6 flex flex-col gap-4 min-h-screen bg-[var(--tg-theme-bg-color,#1c1c1e)]">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="rounded-full bg-gray-800 w-8 h-8 flex items-center justify-center text-sm"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold">Профиль</h1>
      </header>

      <section className="flex items-center gap-4 mt-1">
        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold overflow-hidden">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{avatarLetter}</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold">{profile.displayName}</span>
          <span className="text-xs text-gray-400 mt-1">
            С&nbsp;{new Date(profile.joinedAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
      </section>

      <section aria-label="Основная статистика" className="grid grid-cols-2 gap-3 mt-2">
        <div className="rounded-lg bg-gray-800 px-3 py-2 flex flex-col">
          <span className="text-[10px] uppercase text-gray-400">Матчей</span>
          <span className="text-lg font-semibold mt-1">{stats.matchesPlayed}</span>
        </div>
        <div className="rounded-lg bg-gray-800 px-3 py-2 flex flex-col">
          <span className="text-[10px] uppercase text-gray-400">Победы</span>
          <span className="text-lg font-semibold mt-1">
            {stats.wins}
            {stats.matchesPlayed > 0 ? ` (${winRatePercent}%)` : ''}
          </span>
        </div>
        <div className="rounded-lg bg-gray-800 px-3 py-2 flex flex-col">
          <span className="text-[10px] uppercase text-gray-400">Серия</span>
          <span className="text-xs mt-1">
            Текущая: <span className="font-semibold">{stats.currentWinStreak}</span>
          </span>
          <span className="text-xs">
            Лучшая: <span className="font-semibold">{stats.bestWinStreak}</span>
          </span>
        </div>
        <div className="rounded-lg bg-gray-800 px-3 py-2 flex flex-col">
          <span className="text-[10px] uppercase text-gray-400">Любимый режим</span>
          <span className="text-xs mt-1">
            {stats.favoriteMode === 'podkidnoy'
              ? 'Подкидной'
              : stats.favoriteMode === 'perevodnoy'
                ? 'Переводной'
                : 'Нет данных'}
          </span>
        </div>
      </section>

      <section aria-label="Статистика по режимам" className="mt-1 space-y-2">
        <h2 className="text-sm font-semibold">По режимам</h2>
        <div className="flex flex-col gap-2">
          {(['podkidnoy', 'perevodnoy'] as const).map((mode) => {
            const bucket = stats.perModeTotals?.[mode];
            if (!bucket || bucket.matchesPlayed === 0) {
              return null;
            }
            return (
              <div key={mode} className="rounded-lg bg-gray-900 px-3 py-2 text-xs flex justify-between">
                <div>
                  <div className="font-medium">
                    {mode === 'podkidnoy' ? 'Подкидной' : 'Переводной'}
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    Матчей: {bucket.matchesPlayed} · Побед: {bucket.wins} · Поражений: {bucket.losses} · Ничьих:{' '}
                    {bucket.draws}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Достижения" className="mt-1 space-y-2">
        <h2 className="text-sm font-semibold">Достижения</h2>
        {achievements.length === 0 ? (
          <p className="text-xs text-gray-400">Ещё нет достижений — сыграйте несколько партий!</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="achievements-strip">
            {achievements.slice(0, 6).map((a) => {
              const target = a.targetValue ?? 0;
              const current = a.currentValue ?? 0;
              const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : undefined;
              const unlocked = Boolean(a.unlockedAt && progress === undefined ? true : progress === 100);
              const title = a.name ?? a.code;
              const icon = a.icon ?? '⭐';
              return (
                <div
                  key={a.code}
                  className={`min-w-[120px] rounded-lg px-3 py-2 text-xs flex flex-col ${
                    unlocked ? 'bg-emerald-700/70' : 'bg-gray-800'
                  }`}
                >
                  <span className="font-semibold">
                    {icon ? `${icon} ${title}` : title}
                  </span>
                  {progress !== undefined && (
                    <span className="mt-1 text-[11px] text-gray-200">
                      Прогресс: {current}/{target} ({progress}%)
                    </span>
                  )}
                  {unlocked && a.unlockedAt && (
                    <span className="mt-1 text-[10px] text-gray-300">
                      Открыто {new Date(a.unlockedAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className="mt-2 space-y-2 border-t border-gray-800 pt-3"
          aria-label="Список всех достижений"
          data-testid="achievements-list"
        >
          {achievements.map((a) => {
            const target = a.targetValue ?? 0;
            const current = a.currentValue ?? 0;
            const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const unlocked = Boolean(a.unlockedAt) || (target > 0 && current >= target);
            const title = a.name ?? a.code;
            const description = a.description ?? 'Достижение в вашей статистике.';
            const icon = a.icon ?? '⭐';
            return (
              <div
                key={a.code}
                className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${
                  unlocked ? 'bg-emerald-900/60' : 'bg-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                    <span>{icon}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-gray-400 mt-0.5 text-[11px]">{description}</div>
                  </div>
                </div>
                {target > 0 && (
                  <div className="ml-2 w-24 flex flex-col items-end">
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-emerald-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="mt-0.5 text-[10px] text-gray-300">
                      {current}/{target}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <SeasonRewards />
    </main>
  );
}

