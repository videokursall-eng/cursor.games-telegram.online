import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeParams, TelegramWebApp } from './telegram-webapp.d';

export interface TelegramContextValue {
  /** Whether we're running inside Telegram Web App (SDK available) */
  isTelegram: boolean;
  /** Raw initData string for backend auth */
  initData: string;
  /** Theme params from Telegram (empty if not in Telegram) */
  themeParams: ThemeParams;
  /** light | dark */
  colorScheme: 'light' | 'dark';
  /** Notify Telegram that app is ready (expands viewport, etc.) */
  ready: () => void;
  /** Expand web app to full height */
  expand: () => void;
}

const defaultTheme: ThemeParams = {};

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  initData: '',
  themeParams: defaultTheme,
  colorScheme: 'dark',
  ready: () => {},
  expand: () => {},
});

const INIT_DATA_POLL_DELAY_MS = 150;
const INIT_DATA_POLL_ATTEMPTS = 8;

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tw = window.Telegram?.WebApp;
    if (!tw) return;
    tw.ready();
    tw.expand();
    setWebApp(tw);

    // Telegram may set initData asynchronously (postMessage from client). Poll briefly.
    if (!tw.initData?.trim()) {
      let attempts = 0;
      const id = window.setInterval(() => {
        attempts += 1;
        const current = window.Telegram?.WebApp;
        if (current?.initData?.trim()) {
          window.clearInterval(id);
          setWebApp(current);
          return;
        }
        if (attempts >= INIT_DATA_POLL_ATTEMPTS) {
          window.clearInterval(id);
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(
              '[Telegram Mini App] WebApp available but initData is empty after polling. Open the app from Telegram to sign in.',
            );
          }
        }
      }, INIT_DATA_POLL_DELAY_MS);
      return () => window.clearInterval(id);
    }
  }, []);

  const value = useMemo((): TelegramContextValue => {
    const isTelegram = !!webApp;
    return {
      isTelegram,
      initData: webApp?.initData ?? '',
      themeParams: webApp?.themeParams ?? defaultTheme,
      colorScheme: webApp?.colorScheme ?? 'dark',
      ready: () => webApp?.ready(),
      expand: () => webApp?.expand(),
    };
  }, [webApp]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegramContext(): TelegramContextValue {
  return useContext(TelegramContext);
}
