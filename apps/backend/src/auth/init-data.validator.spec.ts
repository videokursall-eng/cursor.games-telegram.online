import { createHmac } from 'crypto';
import { InitDataValidator } from './init-data.validator';

function buildValidInitData(overrides: { user?: object; auth_date?: number; hash?: string } = {}) {
  const user = overrides.user ?? { id: 123, first_name: 'Test' };
  const auth_date = overrides.auth_date ?? Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(auth_date));
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update('test-bot-token').digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', overrides.hash ?? hash);
  return params.toString();
}

describe('InitDataValidator', () => {
  const validator = new InitDataValidator('test-bot-token');

  it('accepts valid initData', () => {
    const initData = buildValidInitData();
    const result = validator.validate(initData);
    expect(result).not.toBeNull();
    expect(result!.auth_date).toBeGreaterThan(0);
    expect(result!.user?.id).toBe(123);
    expect(result!.user?.first_name).toBe('Test');
  });

  it('rejects empty string', () => {
    expect(validator.validate('')).toBeNull();
    expect(validator.validate('   ')).toBeNull();
  });

  it('rejects tampered hash', () => {
    const initData = buildValidInitData({ hash: 'wrong' });
    expect(validator.validate(initData)).toBeNull();
  });

  it('rejects missing hash', () => {
    const params = new URLSearchParams({ user: '{"id":1,"first_name":"x"}', auth_date: String(Math.floor(Date.now() / 1000)) });
    expect(validator.validate(params.toString())).toBeNull();
  });

  it('rejects expired auth_date', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
    const initData = buildValidInitData({ auth_date: oldDate });
    expect(validator.validate(initData)).toBeNull();
  });
});
