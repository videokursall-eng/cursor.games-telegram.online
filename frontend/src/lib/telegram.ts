/* Telegram WebApp SDK wrapper */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    hash: string;
    auth_date: number;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    enable: () => void;
    disable: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback: (ok: boolean) => void) => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

const tg = (): TelegramWebApp | null => window.Telegram?.WebApp ?? null;

let _backButtonCallback: (() => void) | null = null;

export const initTelegram = (): void => {
  const app = tg();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor('#054d1b');
  app.setBackgroundColor('#076324');
};

export const getInitData = (): string => tg()?.initData ?? '';

export const getTelegramUser = (): TelegramUser | null =>
  tg()?.initDataUnsafe?.user ?? null;

export const getStartParam = (): string | null =>
  tg()?.initDataUnsafe?.start_param ?? null;

export const showBackButton = (onClick: () => void): void => {
  const app = tg();
  if (!app) return;
  if (_backButtonCallback) app.BackButton.offClick(_backButtonCallback);
  _backButtonCallback = onClick;
  app.BackButton.onClick(onClick);
  app.BackButton.show();
};

export const hideBackButton = (): void => {
  const app = tg();
  if (!app) return;
  if (_backButtonCallback) {
    app.BackButton.offClick(_backButtonCallback);
    _backButtonCallback = null;
  }
  app.BackButton.hide();
};

export const hapticImpact = (style: 'light' | 'medium' | 'heavy' = 'light'): void => {
  tg()?.HapticFeedback.impactOccurred(style);
};

export const hapticNotification = (type: 'success' | 'error' | 'warning'): void => {
  tg()?.HapticFeedback.notificationOccurred(type);
};

export const shareRoomLink = (link: string): void => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Сыграем в Дурака? 🃏 Жми на ссылку!')}`;
  tg()?.openTelegramLink(shareUrl);
};

export const isTelegram = (): boolean => Boolean(window.Telegram?.WebApp);

export const getPlatform = (): string => tg()?.platform ?? 'web';
