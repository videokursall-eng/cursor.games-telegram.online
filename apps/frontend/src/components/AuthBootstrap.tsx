import { useEffect } from 'react';
import { useTelegramContext } from '../telegram';
import { useAuthStore } from '../store/authStore';

/**
 * Runs once on mount: if we have Telegram initData, sends it to backend and stores session.
 * Does not block render; app shows immediately.
 */
export function AuthBootstrap() {
  const { initData, isTelegram } = useTelegramContext();
  const login = useAuthStore((s) => s.login);
  const setAuthAttempted = useAuthStore((s) => s.setAuthAttempted);

  useEffect(() => {
    if (isTelegram && initData) {
      login(initData).catch(() => {});
    } else {
      setAuthAttempted();
    }
  }, [isTelegram, initData, login, setAuthAttempted]);

  return null;
}
