import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { RealtimeService } from '../realtime/realtime.service';
import { RoomsService } from '../rooms/rooms.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';
import type { GameState } from 'game-core';
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

/**
 * Real backend full-flow: create room with bot → start match → human acts →
 * bot becomes active → advance only bot delay → assert bot made a move and state changed.
 * No room/state mocks; uses real room creation, start match, and bot lifecycle.
 */
describe('Bot full-flow e2e: create room → start → bot moves', () => {
  let service: RoomsService;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.DURAK_BOT_ACTION_DELAY_MS = '10';
    service = createService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    service.clearAllTimers();
    jest.useRealTimers();
    delete process.env.DURAK_BOT_ACTION_DELAY_MS;
  });

  it('creates room with bot, starts match, human attacks, bot lifecycle runs and state changes', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    expect(room.id).toBeDefined();
    expect(room.bots).toHaveLength(1);
    const botId = room.bots[0]!.id;
    expect(room.bots[0]!.isBot).toBe(true);

    const started = service.startMatch(room.id, 'u1');
    expect(started).toBeDefined();
    expect(started!.status).toBe('in_progress');
    expect(started!.game).toBeDefined();
    const game0 = started!.game as GameState;
    expect(game0.players).toHaveLength(2);
    expect(game0.players.some((p) => p.id === botId)).toBe(true);

    let current = service.getRoom(room.id)!;
    let turnBeforeBot = current.turn;

    const attacker = (current.game as GameState).players[(current.game as GameState).attackerIndex];
    if (attacker.id === 'u1') {
      service.applyAction(room.id, 'u1', { type: 'attack', card: attacker.hand[0] });
      current = service.getRoom(room.id)!;
      turnBeforeBot = current.turn;
    }

    const activeId =
      (current.game as GameState).phase === 'defense'
        ? (current.game as GameState).players[(current.game as GameState).defenderIndex].id
        : (current.game as GameState).players[(current.game as GameState).attackerIndex].id;
    expect(activeId).toBe(botId);

    advanceBotDelay(jest);

    const afterBot = service.getRoom(room.id)!;
    expect(afterBot.turn).toBeGreaterThan(turnBeforeBot);
    expect(afterBot.game).toBeDefined();
    const gameAfterBot = afterBot.game as GameState;
    expect(gameAfterBot.players).toHaveLength(2);
  });
});
