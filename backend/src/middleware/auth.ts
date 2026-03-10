import * as crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface ValidatedInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
  chat_instance?: string;
  chat_type?: string;
}

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash in initData');

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (expectedHash !== hash) throw new Error('Invalid initData hash');

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) throw new Error('initData expired');

  const userJson = params.get('user');
  if (!userJson) throw new Error('Missing user in initData');

  const user: TelegramUser = JSON.parse(userJson);

  return {
    user,
    auth_date: authDate,
    hash,
    start_param: params.get('start_param') || undefined,
    chat_instance: params.get('chat_instance') || undefined,
    chat_type: params.get('chat_type') || undefined,
  };
}
