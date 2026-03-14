import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { RealtimeService } from '../realtime/realtime.service';
import { RoomsService } from '../rooms/rooms.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';
import * as botsAdapter from './bots.adapter';
import type { BotProfile } from './bots.types';
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

describe('Bot profile full-flow: room → set difficulty → start match → bot uses selected profile', () => {
  let service: RoomsService;
  let buildBotContextProfiles: BotProfile[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.DURAK_BOT_ACTION_DELAY_MS = '10';
    service = createService();
    buildBotContextProfiles = [];
    const original = botsAdapter.buildBotContext;
    jest.spyOn(botsAdapter, 'buildBotContext').mockImplementation((room, botPlayerId, profiles) => {
      buildBotContextProfiles = [...profiles];
      return original(room, botPlayerId, profiles);
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    service.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete process.env.DURAK_BOT_ACTION_DELAY_MS;
  });

  it('create room with bot → set difficulty to hard → start match → bot step uses hard profile', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    const botId = room.bots[0]!.id;
    expect(room.bots[0]!.botProfile?.difficulty).toBe('easy');

    service.updateBotProfile(room.id, 'u1', botId, { difficulty: 'hard' });
    const afterUpdate = service.getRoom(room.id)!;
    expect(afterUpdate.bots[0]!.botProfile?.difficulty).toBe('hard');
    expect(afterUpdate.bots[0]!.botProfile?.profileId).toContain('hard');

    const started = service.startMatch(room.id, 'u1')!;
    expect(started.game).toBeDefined();
    expect(started.bots[0]!.botProfile?.difficulty).toBe('hard');

    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });

    const beforeTurn = service.getRoom(room.id)!.turn;
    advanceBotDelay(jest);

    const after = service.getRoom(room.id)!;
    expect(after.game).toBeDefined();
    expect(after.turn).toBeGreaterThan(beforeTurn);

    const botProfileUsed = buildBotContextProfiles.find((p) => p.id === botId);
    expect(botProfileUsed).toBeDefined();
    expect(botProfileUsed!.difficulty).toBe('hard');
    expect(after.bots[0]!.botProfile?.difficulty).toBe('hard');
  });
});
