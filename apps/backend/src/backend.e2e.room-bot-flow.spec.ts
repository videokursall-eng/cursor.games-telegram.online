import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { startTestServer, stopTestServer, getE2ESecret } from './test/server-helpers';

const api = (baseUrl: string, path: string, options: RequestInit & { token?: string } = {}) => {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
};

describe('Backend HTTP e2e: room bot flow', () => {
  let baseUrl: string;
  let token: string;
  let roomId: string;
  let botId: string;
  let userId: string;

  beforeAll(async () => {
    const { baseUrl: url } = await startTestServer(3001);
    baseUrl = url;

    const tokenRes = await api(baseUrl, '/auth/e2e-token', {
      method: 'POST',
      body: JSON.stringify({ secret: getE2ESecret() }),
    });
    expect(tokenRes.ok).toBe(true);
    const tokenData = (await tokenRes.json()) as { ok: boolean; accessToken?: string; user?: { id: string } };
    expect(tokenData.accessToken).toBeDefined();
    token = tokenData.accessToken!;
    userId = tokenData.user?.id ?? '';
  }, 20_000);

  afterAll(() => {
    stopTestServer();
  });

  it('creates room via POST /rooms with bot', async () => {
    const res = await api(baseUrl, '/rooms', {
      method: 'POST',
      token,
      body: JSON.stringify({
        mode: 'podkidnoy',
        maxPlayers: 2,
        isPrivate: false,
        bots: 1,
      }),
    });
    expect(res.ok).toBe(true);
    const room = (await res.json()) as { id: string; bots: { id: string }[] };
    expect(room.id).toBeDefined();
    expect(room.bots).toHaveLength(1);
    roomId = room.id;
    botId = room.bots[0].id;
  });

  it('gets room via GET /rooms/:id', async () => {
    const res = await api(baseUrl, `/rooms/${roomId}`, { token });
    expect(res.ok).toBe(true);
    const room = (await res.json()) as { id: string; status: string; bots: { id: string; botProfile?: { difficulty: string } }[] };
    expect(room.id).toBe(roomId);
    expect(room.bots[0].id).toBe(botId);
  });

  it('updates bot profile via POST /rooms/:id/bots/:botId/profile', async () => {
    const res = await api(baseUrl, `/rooms/${roomId}/bots/${botId}/profile`, {
      method: 'POST',
      token,
      body: JSON.stringify({ difficulty: 'hard' }),
    });
    expect(res.ok).toBe(true);
    const room = (await res.json()) as { bots: { botProfile?: { difficulty: string } }[] };
    expect(room.bots[0].botProfile?.difficulty).toBe('hard');
  });

  it('starts match via POST /rooms/:id/start', async () => {
    const res = await api(baseUrl, `/rooms/${roomId}/start`, { method: 'POST', token });
    expect(res.ok).toBe(true);
    const room = (await res.json()) as { status: string; game?: unknown };
    expect(room.status).toBe('in_progress');
    expect(room.game).toBeDefined();
  });

  it('bot lifecycle runs and room state changes after bot move', async () => {
    const getRoom = () =>
      api(baseUrl, `/rooms/${roomId}`, { token }).then((r) => r.json()) as Promise<{
        turn: number;
        game?: {
          players: { id: string }[];
          attackerIndex: number;
          defenderIndex: number;
          phase: string;
          table: { attack: { rank: string; suit: string } }[];
        };
      }>;
    const initial = await getRoom();
    const game = initial.game;
    if (game) {
      const attacker = game.players[game.attackerIndex];
      if (attacker && attacker.id.startsWith('e2e-')) {
        const hand = (game as unknown as { players: { id: string; hand: { rank: string; suit: string }[] }[] }).players[game.attackerIndex].hand;
        if (hand && hand[0]) {
          await api(baseUrl, `/rooms/${roomId}/action`, {
            method: 'POST',
            token,
            body: JSON.stringify({ type: 'attack', card: hand[0] }),
          });
        }
      }
    }

    const turnAfterHuman = (await getRoom()).turn;
    const deadline = Date.now() + 15_000;
    let lastTurn = turnAfterHuman;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
      const room = await getRoom();
      lastTurn = room.turn;
      if (room.turn > turnAfterHuman) break;
    }

    expect(lastTurn).toBeGreaterThan(turnAfterHuman);
  });

  it('persists stats in DB and exposes profile API', async () => {
    const prisma = new PrismaClient();
    try {
      const records = await prisma.playerMatchRecord.findMany({
        where: { userId },
      });
      expect(records.length).toBeGreaterThanOrEqual(1);

      const res = await api(baseUrl, '/me/profile', { token });
      expect(res.ok).toBe(true);
      const data = (await res.json()) as {
        profile: { userId: string };
        stats: { matchesPlayed: number };
        achievements: { code: string }[];
      };
      expect(data.profile.userId).toBe(userId);
      expect(data.stats.matchesPlayed).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.achievements)).toBe(true);
      expect(data.achievements.length).toBeGreaterThanOrEqual(1);
      const achievementCodes = data.achievements.map((a) => a.code);
      expect(achievementCodes).toContain('first_match');
    } finally {
      await prisma.$disconnect();
    }
  });
});
