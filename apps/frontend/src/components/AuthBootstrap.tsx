import { useEffect, useRef } from 'react';
import { useTelegramContext } from '../telegram';
import { useAuthStore } from '../store/authStore';

/** Max wait for initData (TelegramContext: SDK + URL hash + poll ~5s) */
const WAIT_INIT_DATA_MS = 5500;

/**
 * Runs once on mount: if we have Telegram initData, sends it to backend and stores session.
 * When in Telegram but initData is still empty, waits briefly for it (polling in TelegramContext).
 */
export function AuthBootstrap() {
  const { initData, isTelegram } = useTelegramContext();
  const login = useAuthStore((s) => s.login);
  const setAuthAttempted = useAuthStore((s) => s.setAuthAttempted);
  const waitDone = useRef(false);

  useEffect(() => {
    if (isTelegram && initData) {
      waitDone.current = true;
      login(initData).catch(() => {});
      return;
    }
    if (isTelegram && !initData && !waitDone.current) {
      const t = window.setTimeout(() => {
        waitDone.current = true;
        setAuthAttempted();
      }, WAIT_INIT_DATA_MS);
      return () => window.clearTimeout(t);
    }
    setAuthAttempted();
  }, [isTelegram, initData, login, setAuthAttempted]);

  return null;
}
