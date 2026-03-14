/**
 * Telegram Mini App initData / user types (shared between frontend and backend)
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitDataParsed {
  user?: TelegramWebAppUser;
  auth_date: number;
  hash: string;
  [key: string]: string | number | TelegramWebAppUser | undefined;
}

/** Raw initData string as sent by Telegram Web App (query string) */
export type InitDataRaw = string;

export interface AuthSessionPayload {
  userId: string;
  telegramId: number;
  iat?: number;
  exp?: number;
}
