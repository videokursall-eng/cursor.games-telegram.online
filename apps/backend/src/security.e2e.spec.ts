import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { startTestServer, stopTestServer, getE2ESecret } from './test/server-helpers';

const api = (baseUrl: string, path: string, options: RequestInit & { token?: string } = {}) => {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
};

// These e2e scenarios require a real DATABASE_URL configured in the environment.
// If DATABASE_URL is missing, we skip this suite to avoid breaking default test runs.
const shouldRunE2E = !!process.env.DATABASE_URL;

(shouldRunE2E ? describe : describe.skip)('Security/abuse e2e scenarios', () => {
  let baseUrl: string;
  let token: string;

  beforeAll(async () => {
    const { baseUrl: url } = await startTestServer(3002);
    baseUrl = url;

    const tokenRes = await api(baseUrl, '/auth/e2e-token', {
      method: 'POST',
      body: JSON.stringify({ secret: getE2ESecret() }),
    });
    expect(tokenRes.ok).toBe(true);
    const tokenData = (await tokenRes.json()) as { ok: boolean; accessToken?: string; user?: { id: string } };
    expect(tokenData.accessToken).toBeDefined();
    token = tokenData.accessToken!;
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  it('blocks invite/join spam via HTTP rate limit while normal join works', async () => {
    // happy path: create room and join once
    const create = await api(baseUrl, '/rooms', {
      method: 'POST',
      token,
      body: JSON.stringify({
        mode: 'podkidnoy',
        maxPlayers: 2,
        isPrivate: false,
        bots: 0,
      }),
    });
    expect(create.ok).toBe(true);
    const room = (await create.json()) as { id: string };
    const roomId = room.id;

    const joinOk = await api(baseUrl, `/rooms/${roomId}/join`, {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    });
    expect(joinOk.ok).toBe(true);

    // abuse: spam joins from same IP/token until rate limit hits
    let rateLimited = false;
    for (let i = 0; i < 50; i++) {
      const res = await api(baseUrl, `/rooms/${roomId}/join`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        rateLimited = true;
        break;
      }
    }
    expect(rateLimited).toBe(true);
  });

  it('does not double-apply Stars payment confirm', async () => {
    // minimal flow: create a product via admin seed and confirm twice
    const productsRes = await api(baseUrl, '/payments/stars/products', { token });
    expect(productsRes.ok).toBe(true);
    const products = (await productsRes.json()) as { id: string }[];
    expect(products.length).toBeGreaterThan(0);
    const productId = products[0].id;

    const intentRes = await api(baseUrl, '/payments/stars/create-intent', {
      method: 'POST',
      token,
      body: JSON.stringify({ productId }),
    });
    expect(intentRes.ok).toBe(true);
    const intent = (await intentRes.json()) as { id: string };

    const firstConfirm = await api(baseUrl, '/payments/stars/confirm', {
      method: 'POST',
      token,
      body: JSON.stringify({ intentId: intent.id, payload: { mock: true } }),
    });
    expect(firstConfirm.ok).toBe(true);

    const secondConfirm = await api(baseUrl, '/payments/stars/confirm', {
      method: 'POST',
      token,
      body: JSON.stringify({ intentId: intent.id, payload: { mock: true } }),
    });
    expect(secondConfirm.ok).toBe(true);
    const secondBody = (await secondConfirm.json()) as { intent: { status: string } };
    expect(secondBody.intent.status).toBe('completed');
  });

  it('does not expose sensitive fields in /me/profile response', async () => {
    const res = await api(baseUrl, '/me/profile', { token });
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    // Basic shape assumptions
    expect(data.profile).toBeDefined();
    expect(data.stats).toBeDefined();
    expect(data.achievements).toBeDefined();

    // Ensure there are no obvious sensitive fields accidentally leaking
    const json = JSON.stringify(data);
    expect(json.includes('accessToken')).toBe(false);
    expect(json.toLowerCase().includes('password')).toBe(false);
    expect(json.toLowerCase().includes('secret')).toBe(false);
    expect(json.toLowerCase().includes('initdata')).toBe(false);
  });
});

