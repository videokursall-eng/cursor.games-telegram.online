import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { RealtimeService } from '../realtime/realtime.service';
import { RoomsService } from '../rooms/rooms.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';
import type { GameState, Card } from 'game-core';
import { createDeck } from 'game-core';
import { advanceBotDelay } from '../test/timer-helpers';

const mockStatsService = { recordMatchComplete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };

function createService(): RoomsService {
  const realtime = {
    broadcastRoomSnapshot: jest.fn(),
  } as unknown as RealtimeService;
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredLoggerService;
  return new RoomsService(realtime, mockStatsService as never, logger);
}

/** Deterministic shuffle for stable test: same seed => same deck order. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

describe('Bot long match integration flow', () => {
  let service: RoomsService;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.DURAK_BOT_ACTION_DELAY_MS = '5';
    service = createService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    service.clearAllTimers();
    jest.useRealTimers();
    delete process.env.DURAK_BOT_ACTION_DELAY_MS;
  });

  it('plays a longer human ↔ bot sequence without duplicates or stalls', async () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    const presetDeck = seededShuffle(createDeck(), 123);
    service.startMatch(room.id, 'u1', { presetDeck })!;

    let current = service.getRoom(room.id)!;
    const turnHistory: number[] = [];
    const phasesSeen = new Set<string>();
    let humanActions = 0;
    let botActions = 0;

    for (let step = 0; step < 150; step += 1) {
      if (current.status !== 'in_progress' || !current.game) break;

      const game = current.game as GameState;
      phasesSeen.add(game.phase);

      const attacker = game.players[game.attackerIndex];
      const defender = game.players[game.defenderIndex];
      const activeId = game.phase === 'defense' ? defender.id : attacker.id;
      const beforeTurn = current.turn;

      if (activeId === 'u1') {
        if (game.phase === 'attack' && game.table.length === 0 && attacker.hand.length > 0) {
          const card = attacker.hand[0] as Card;
          await service.applyAction(current.id, attacker.id, { type: 'attack', card });
          humanActions += 1;
        } else if (game.phase === 'defense' && defender.id === 'u1') {
          await service.applyAction(current.id, defender.id, { type: 'take' });
          humanActions += 1;
        } else {
          await service.applyAction(current.id, 'u1', { type: 'finish' });
          humanActions += 1;
        }

        const updated = service.getRoom(current.id)!;
        if (updated.turn > beforeTurn) {
          turnHistory.push(updated.turn);
        }
        current = updated;
      } else {
        advanceBotDelay(jest);
        const updated = service.getRoom(current.id)!;
        if (updated.turn > beforeTurn) {
          turnHistory.push(updated.turn);
          botActions += 1;
          current = updated;
        } else {
          current = updated;
        }
      }
    }

    expect(turnHistory.length).toBeGreaterThanOrEqual(30);
    expect(humanActions).toBeGreaterThanOrEqual(3);
    expect(botActions).toBeGreaterThanOrEqual(2);

    for (let i = 1; i < turnHistory.length; i += 1) {
      expect(turnHistory[i]).toBeGreaterThan(turnHistory[i - 1]);
    }

    expect(phasesSeen.has('defense') || phasesSeen.has('cleanup')).toBe(true);

    const finalRoom = service.getRoom(room.id)!;
    expect(finalRoom.game).toBeDefined();
  });
});

