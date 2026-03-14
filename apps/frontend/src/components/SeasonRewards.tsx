import { useEffect, useState } from 'react';
import type { SeasonWithTrackDto, SeasonRewardTrackItemDto } from 'shared';
import { useAuthStore } from '../store/authStore';
import { fetchMySeason, claimSeasonReward } from '../api/season';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function SeasonRewards() {
  const token = useAuthStore((s) => s.accessToken);
  const [season, setSeason] = useState<SeasonWithTrackDto | null>(null);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const data = await fetchMySeason(token);
        if (!cancelled) {
          setSeason(data);
          setStatus('loaded');
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить сезонный прогресс.');
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
    return null;
  }

  if (status === 'loading' && !season) {
    return <p className="text-xs text-gray-400">Загрузка сезонного прогресса…</p>;
  }

  if (status === 'error' && error && !season) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  if (!season) {
    return null;
  }

  const { progress, rewardTrack } = season;

  async function handleClaim(item: SeasonRewardTrackItemDto) {
    if (!token || !item.claimable) return;
    setClaimingLevel(item.level);
    setError(null);
    try {
      const updated = await claimSeasonReward(item.level, token);
      setSeason(updated);
    } catch {
      setError('Не удалось забрать награду. Попробуйте позже.');
    } finally {
      setClaimingLevel(null);
    }
  }

  return (
    <section aria-label="Сезонный прогресс" className="mt-3 space-y-2">
      <h2 className="text-sm font-semibold">Сезонный прогресс</h2>
      <div className="text-xs text-gray-300">
        Уровень: <span className="font-semibold">{progress.level}</span> · XP:{' '}
        <span className="font-semibold">
          {progress.currentXp}/{progress.currentXp + progress.xpToNextLevel}
        </span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="space-y-1 text-xs" data-testid="season-reward-track">
        {rewardTrack.length === 0 && (
          <p className="text-gray-400">Награды сезона пока не настроены.</p>
        )}
        {rewardTrack.map((item) => {
          const isClaimed = item.claimed;
          const isClaimable = item.claimable;
          let rewardLabel = '';
          if (item.rewardType === 'soft') {
            rewardLabel = `${item.softAmount ?? 0} монет`;
          } else if (item.rewardType === 'cosmetic') {
            rewardLabel = `Косметика: ${item.cosmeticCode ?? ''}`;
          } else if (item.rewardType === 'badge') {
            const title = item.badge?.title ?? item.badgeCode ?? '';
            rewardLabel = `Бейдж: ${title}`;
          }

          return (
            <div
              key={item.level}
              className={`rounded-lg px-3 py-2 flex items-center justify-between ${
                isClaimed ? 'bg-emerald-900/60' : isClaimable ? 'bg-emerald-700/40' : 'bg-gray-900'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold">
                  Уровень {item.level}{' '}
                  {isClaimed ? '· Получено' : isClaimable ? '· Доступно' : '· Закрыто'}
                </span>
                <span className="text-gray-300 mt-0.5">{rewardLabel}</span>
              </div>
              {isClaimable && (
                <button
                  type="button"
                  className="ml-3 px-2 py-1 rounded bg-emerald-600 text-[11px]"
                  disabled={claimingLevel === item.level}
                  onClick={() => void handleClaim(item)}
                >
                  {claimingLevel === item.level ? 'Забираем…' : 'Забрать'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

