import { createHmac } from 'crypto';
import type { TelegramWebAppUser } from 'shared';

const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

export interface ValidatedInitData {
  user?: TelegramWebAppUser;
  auth_date: number;
}

export class InitDataValidator {
  constructor(private readonly botToken: string) {}

  validate(initDataRaw: string): ValidatedInitData | null {
    if (!initDataRaw?.trim()) return null;

    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return null;

    const dataCheckString = Array.from(params.entries())
      .filter(([k]) => k !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(this.botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const authDate = params.get('auth_date');
    if (!authDate) return null;
    const authDateNum = parseInt(authDate, 10);
    if (Number.isNaN(authDateNum)) return null;
    if (Date.now() / 1000 - authDateNum > INIT_DATA_MAX_AGE_SEC) return null;

    const userParam = params.get('user');
    let user: TelegramWebAppUser | undefined;
    if (userParam) {
      try {
        user = JSON.parse(userParam) as TelegramWebAppUser;
        if (!user?.id || typeof user.id !== 'number') user = undefined;
      } catch {
        user = undefined;
      }
    }

    return { user, auth_date: authDateNum };
  }
}
