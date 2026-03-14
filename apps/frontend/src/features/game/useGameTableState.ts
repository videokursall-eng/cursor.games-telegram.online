import { useEffect, useState, useCallback } from 'react';
import { getRoom } from '../../api/rooms';
import { useAuthStore } from '../../store/authStore';
import { adaptRoomToGameTableState, type GameTableMeta, type GameTableState } from './adapters';

export function useGameTableState(roomId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<GameTableState | null>(null);
  const [meta, setMeta] = useState<GameTableMeta>({
    loading: true,
    error: null,
    syncing: false,
    reconnecting: false,
    offline: false,
    stale: false,
  });
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!roomId || !token || !user) {
      setMeta({
        loading: false,
        error: 'Комната недоступна',
        syncing: false,
        reconnecting: false,
        offline: false,
        stale: false,
      });
      setState(null);
      return;
    }
    try {
      setMeta((m) => ({
        ...m,
        syncing: !m.loading,
        reconnecting: m.offline || !!m.error,
        offline: false,
      }));
      const room = await getRoom(roomId, token);
      if (!room) {
        setState(null);
        setMeta({
          loading: false,
          error: 'Комната не найдена',
          syncing: false,
          reconnecting: false,
          offline: false,
          stale: false,
        });
        return;
      }
      const next = adaptRoomToGameTableState(room, user.id);
      setState(next);
      setLastSuccessAt(Date.now());
      setMeta({
        loading: false,
        error: null,
        syncing: false,
        reconnecting: false,
        offline: false,
        stale: false,
      });
    } catch (e) {
      const err = e as Error;
      const isNetworkError =
        !navigator.onLine || /Failed to fetch|NetworkError/i.test(err.message || '');
      if (isNetworkError) {
        // Остаёмся на последнем успешном состоянии, помечая его как offline/stale.
        setMeta((m) => ({
          ...m,
          loading: false,
          error: 'Проблемы с сетью',
          syncing: false,
          reconnecting: false,
          offline: true,
          stale: !!state,
        }));
      } else {
        setMeta({
          loading: false,
          error: err.message || 'Ошибка загрузки матча',
          syncing: false,
          reconnecting: false,
          offline: false,
          stale: false,
        });
        if (!state) {
          setState(null);
        }
      }
    }
  }, [roomId, token, user, state]);

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchOnce();
    })();
    const interval = setInterval(() => {
      if (!active) return;
      void fetchOnce();
    }, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchOnce]);

  // Отметка "устаревшего" состояния, если давно не было успешного refetch.
  useEffect(() => {
    if (!lastSuccessAt) return;
    const id = setInterval(() => {
      setMeta((m) => {
        if (m.offline || m.loading) return m;
        const now = Date.now();
        const stale = now - lastSuccessAt > 15_000;
        if (stale === m.stale) return m;
        return { ...m, stale };
      });
    }, 5000);
    return () => clearInterval(id);
  }, [lastSuccessAt]);

  // Автоматический refetch при восстановлении сети.
  useEffect(() => {
    const handleOnline = () => {
      setMeta((m) => ({ ...m, offline: false, reconnecting: true }));
      void fetchOnce();
    };
    const handleOffline = () => {
      setMeta((m) => ({ ...m, offline: true }));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchOnce]);

  return { state, meta, refetch: fetchOnce };
}

