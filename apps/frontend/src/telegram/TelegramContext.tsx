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

const INIT_DATA_POLL_DELAY_MS = 200;
const INIT_DATA_POLL_ATTEMPTS = 25;

/**
 * Telegram passes init data in the URL fragment as tgWebAppData=query_string.
 * Use this when Telegram.WebApp.initData is empty (e.g. SDK didn't parse it yet or client uses hash only).
 */
function getInitDataFromHash(): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.slice(1);
  if (!hash) return '';
  try {
    const params = new URLSearchParams(hash);
    const tgWebAppData = params.get('tgWebAppData');
    if (tgWebAppData && tgWebAppData.includes('hash=') && tgWebAppData.includes('auth_date=')) {
      return tgWebAppData;
    }
    if (params.has('hash') && params.has('auth_date')) {
      return hash;
    }
  } catch {
    // ignore
  }
  return '';
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [initDataFromUrl, setInitDataFromUrl] = useState('');

  useEffect(() => {
    const tw = window.Telegram?.WebApp;
    if (!tw) return;
    tw.ready();
    tw.expand();
    setWebApp(tw);

    const rawFromSdk = tw.initData?.trim();
    const rawFromHash = getInitDataFromHash();

    if (rawFromSdk) {
      setInitDataFromUrl('');
      setWebApp(tw);
      return;
    }
    if (rawFromHash) {
      setInitDataFromUrl(rawFromHash);
      setWebApp(tw);
      return;
    }

    // Neither SDK nor hash: poll both (SDK may get it via postMessage; hash may appear).
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      const current = window.Telegram?.WebApp;
      const sdkData = current?.initData?.trim();
      if (sdkData && current) {
        window.clearInterval(id);
        setWebApp(current);
        setInitDataFromUrl('');
        return;
      }
      const hashData = getInitDataFromHash();
      if (hashData) {
        window.clearInterval(id);
        setInitDataFromUrl(hashData);
        return;
      }
      if (attempts >= INIT_DATA_POLL_ATTEMPTS) {
        window.clearInterval(id);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            '[Telegram Mini App] WebApp available but initData is empty after polling (SDK + URL hash). Open the app from Telegram to sign in.',
          );
        }
      }
    }, INIT_DATA_POLL_DELAY_MS);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo((): TelegramContextValue => {
    const isTelegram = !!webApp;
    const initData = webApp?.initData?.trim() || initDataFromUrl || '';
    return {
      isTelegram,
      initData,
      themeParams: webApp?.themeParams ?? defaultTheme,
      colorScheme: webApp?.colorScheme ?? 'dark',
      ready: () => webApp?.ready(),
      expand: () => webApp?.expand(),
    };
  }, [webApp, initDataFromUrl]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegramContext(): TelegramContextValue {
  return useContext(TelegramContext);
}
