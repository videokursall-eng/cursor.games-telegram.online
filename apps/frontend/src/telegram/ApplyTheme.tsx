import { useEffect } from 'react';
import { useTelegramContext } from './TelegramContext';

/**
 * Applies Telegram theme to document (background, text color). Safe to use outside Telegram.
 */
export function ApplyTheme() {
  const { isTelegram, themeParams, colorScheme } = useTelegramContext();

  useEffect(() => {
    if (!isTelegram || !themeParams) return;
    const d = document.documentElement;
    const bg = themeParams.bg_color ?? (colorScheme === 'light' ? '#ffffff' : '#1c1c1e');
    const text = themeParams.text_color ?? (colorScheme === 'light' ? '#000000' : '#ffffff');
    const hint = themeParams.hint_color ?? (colorScheme === 'light' ? '#999999' : '#98989d');
    d.style.setProperty('--tg-theme-bg-color', bg);
    d.style.setProperty('--tg-theme-text-color', text);
    d.style.setProperty('--tg-theme-hint-color', hint);
    document.body.style.backgroundColor = bg;
    document.body.style.color = text;
  }, [isTelegram, themeParams, colorScheme]);

  return null;
}
