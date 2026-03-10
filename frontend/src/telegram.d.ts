interface TelegramWebApp {
  openTelegramLink: (url: string) => void;
  close: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: Record<string, unknown>;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
