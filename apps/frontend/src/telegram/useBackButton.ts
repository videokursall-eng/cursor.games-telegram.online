import { useEffect } from 'react';
import { useTelegramContext } from './TelegramContext';

/**
 * Show Telegram BackButton when mounted; hide when unmounted. Call onBack when user taps back.
 */
export function useBackButton(onBack: () => void) {
  const { isTelegram } = useTelegramContext();

  useEffect(() => {
    if (!isTelegram || !window.Telegram?.WebApp) return;
    const tw = window.Telegram.WebApp;
    tw.showBackButton();
    tw.onBackButtonClick(onBack);
    return () => {
      tw.hideBackButton();
    };
  }, [isTelegram, onBack]);
}
