import { createHmac } from 'crypto';
import type { TelegramWebAppUser } from 'shared';

const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

export interface ValidatedInitData {
  user?: TelegramWebAppUser;
  auth_date: number;
}

export class InitDataValidator {
  /**
   * Accepts either a raw bot token or a precomputed secret key.
   * - If the string looks like a 64-char hex, it is treated as the secret key (SHA256(bot_token)).
   * - Otherwise it is treated as bot token and converted to secret key with HMAC("WebAppData", bot_token).
   */
  constructor(private readonly tokenOrSecret: string) {}

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

    if (!this.tokenOrSecret) return null;

    let secretKey: Buffer;
    // If looks like hex SHA256, treat as precomputed secret key.
    if (/^[a-f0-9]{64}$/i.test(this.tokenOrSecret)) {
      secretKey = Buffer.from(this.tokenOrSecret, 'hex');
    } else {
      secretKey = createHmac('sha256', 'WebAppData').update(this.tokenOrSecret).digest();
    }

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
