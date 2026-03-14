import { describe, it, expect } from 'vitest';
import {
  GAME_MODES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  type GameMode,
  type RoomPublic,
} from './index';
import type {
  TelegramWebAppUser,
  TelegramInitDataParsed,
  AuthSessionPayload,
} from './telegram';

describe('shared game constants', () => {
  it('defines supported game modes', () => {
    expect(GAME_MODES).toEqual(['podkidnoy', 'perevodnoy']);
  });

  it('enforces valid player count range', () => {
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(6);
    expect(MIN_PLAYERS).toBeLessThan(MAX_PLAYERS);
  });

  it('allows constructing a valid RoomPublic object', () => {
    const mode: GameMode = 'podkidnoy';
    const room: RoomPublic = {
      id: 'room-1',
      mode,
      playerCount: 3,
      maxPlayers: MAX_PLAYERS,
      isStarted: false,
      inviteCode: 'abc123',
    };

    expect(room.id).toBe('room-1');
    expect(room.mode).toBe('podkidnoy');
    expect(room.playerCount).toBeGreaterThanOrEqual(MIN_PLAYERS);
    expect(room.maxPlayers).toBe(MAX_PLAYERS);
    expect(room.isStarted).toBe(false);
    expect(room.inviteCode).toBe('abc123');
  });
});

describe('shared telegram types', () => {
  it('supports a basic TelegramWebAppUser shape', () => {
    const user: TelegramWebAppUser = {
      id: 42,
      first_name: 'Alice',
      username: 'alice',
      is_premium: true,
    };

    expect(user.id).toBe(42);
    expect(user.first_name).toBe('Alice');
    expect(user.username).toBe('alice');
    expect(user.is_premium).toBe(true);
  });

  it('supports parsed init data with extra fields', () => {
    const parsed: TelegramInitDataParsed = {
      auth_date: 1700000000,
      hash: 'hash-value',
      user: {
        id: 1,
        first_name: 'Bob',
      },
      query_id: 'q123',
    };

    expect(parsed.auth_date).toBe(1700000000);
    expect(parsed.hash).toBe('hash-value');
    expect(parsed.user?.first_name).toBe('Bob');
    expect(parsed.query_id).toBe('q123');
  });

  it('allows constructing an AuthSessionPayload', () => {
    const payload: AuthSessionPayload = {
      userId: 'u1',
      telegramId: 123456,
      iat: 1700000000,
      exp: 1700003600,
    };

    expect(payload.userId).toBe('u1');
    expect(payload.telegramId).toBe(123456);
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
  });
});


