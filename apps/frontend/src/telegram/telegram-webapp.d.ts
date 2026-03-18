/**
 * Types for Telegram Web App (script loaded from telegram.org/js/telegram-web-app.js)
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  showMainButton: () => void;
  hideMainButton: () => void;
  setMainButton: (params: { text: string; color?: string; text_color?: string }) => void;
  onMainButtonClick: (callback: () => void) => void;
  showBackButton: () => void;
  hideBackButton: () => void;
  onBackButtonClick: (callback: () => void) => void;
  isVersionAtLeast: (version: string) => boolean;
  close: () => void;
  ready: () => void;
  expand: () => void;
}

export {};
