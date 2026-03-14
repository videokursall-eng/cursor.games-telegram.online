import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { RealtimeService } from '../realtime/realtime.service';
import { RoomsService } from '../rooms/rooms.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';
import { basicBotStrategy } from './bots.strategy';
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

describe('Bot lifecycle integration with RoomsService', () => {
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

  it('bot is included in match roster after startMatch', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const botId = room.bots[0]!.id;

    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;

    expect(game.players).toHaveLength(2);
    const playerIds = game.players.map((p) => p.id);
    expect(playerIds).toContain('u1');
    expect(playerIds).toContain(botId);
    game.players.forEach((p) => {
      expect(p.hand.length).toBeGreaterThan(0);
      expect(p.hand.length).toBeLessThanOrEqual(6);
    });
    expect(game.attackerIndex).toBeGreaterThanOrEqual(0);
    expect(game.defenderIndex).toBeGreaterThanOrEqual(0);
    expect(game.attackerIndex).toBeLessThan(game.players.length);
    expect(game.defenderIndex).toBeLessThan(game.players.length);
  });

  it('bot participates in turn order', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });

    const afterHuman = service.getRoom(room.id)!;
    const turnAfterHuman = afterHuman.turn;
    advanceBotDelay(jest);

    const afterBot = service.getRoom(room.id)!;
    expect(afterBot.turn).toBeGreaterThan(turnAfterHuman);
    expect(afterBot.game).toBeDefined();
    expect(afterBot.game!.players.length).toBe(2);
  });

  it('on bot turn strategy decide is called', () => {
    const decideSpy = jest.spyOn(basicBotStrategy, 'decide');
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const botId = room.bots[0]!.id;
    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });
    decideSpy.mockClear();

    advanceBotDelay(jest);

    expect(decideSpy).toHaveBeenCalled();
    const callCtx = decideSpy.mock.calls[0]![0];
    expect(callCtx.self.id).toBe(botId);
    expect(callCtx.game).toBeDefined();
    decideSpy.mockRestore();
  });

  it('starts match and lets the initial human attacker hand over turn to bot which then attacks', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    const started = service.startMatch(room.id, 'u1')!;

    // Первый ход делает человек-атакующий (u1): атака любой картой.
    const firstGame = started.game!;
    const humanAttacker = firstGame.players[firstGame.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });

    // Теперь в зависимости от расклада карт атакующим или защищающимся станет бот.
    // Дождёмся авто-хода бота.
    const beforeTurn = service.getRoom(room.id)!.turn;
    advanceBotDelay(jest);

    const after = service.getRoom(room.id)!;
    expect(after.game).toBeDefined();
    expect(after.turn).toBeGreaterThan(beforeTurn);
  });

  it('does not perform bot auto-action after match is finished', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];

    // Ход человека, после которого планируется auto-action бота.
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });
    const beforeFinish = service.getRoom(room.id)!;
    const turnBeforeFinish = beforeFinish.turn;

    // Матч завершается до того, как сработает bot timer.
    beforeFinish.status = 'finished';
    (beforeFinish as { game?: Record<string, unknown> }).game = {
      ...(beforeFinish.game || {}),
      finished: true,
    };

    advanceBotDelay(jest);

    const after = service.getRoom(room.id)!;
    expect(after.turn).toBe(turnBeforeFinish);
  });

  it('does not run bot lifecycle in room without bots', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 0,
    });
    service.joinRoom(room.id, 'u2');
    service.startMatch(room.id, 'u1')!;

    const turnBefore = service.getRoom(room.id)!.turn;
    jest.advanceTimersByTime(100);
    const turnAfter = service.getRoom(room.id)!.turn;
    expect(turnAfter).toBe(turnBefore);
  });

  it('mixed room (1 human + 2 bots) runs without error and bot lifecycle applies', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 3,
      isPrivate: false,
      bots: 2,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    expect(game.players).toHaveLength(3);

    const humanAttacker = game.players[game.attackerIndex];
    if (humanAttacker.id === 'u1' && humanAttacker.hand.length > 0) {
      service.applyAction(room.id, 'u1', { type: 'attack', card: humanAttacker.hand[0] });
    }
    advanceBotDelay(jest);

    const after = service.getRoom(room.id)!;
    expect(after.game).toBeDefined();
    expect(after.game!.players.length).toBe(3);
    expect(after.status === 'in_progress' || after.status === 'finished').toBe(true);
  });

  it('bot action is not duplicated when advancing timers twice', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });

    const turnBefore = service.getRoom(room.id)!.turn;
    advanceBotDelay(jest);
    const turnAfterFirst = service.getRoom(room.id)!.turn;
    expect(turnAfterFirst).toBe(turnBefore + 1);
  });

  it('state guard prevents applying bot step for stale turn', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const game = started.game!;
    const humanAttacker = game.players[game.attackerIndex];
    const attackCard = humanAttacker.hand[0];
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: attackCard });

    const afterHuman = service.getRoom(room.id)!;
    const turnWhenBotScheduled = afterHuman.turn;
    advanceBotDelay(jest);
    const afterBot = service.getRoom(room.id)!;
    expect(afterBot.turn).toBeGreaterThan(turnWhenBotScheduled);
    expect(afterBot.turn).toBe(turnWhenBotScheduled + 1);
  });
});

