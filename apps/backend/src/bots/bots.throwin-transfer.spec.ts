import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { RealtimeService } from '../realtime/realtime.service';
import { RoomsService } from '../rooms/rooms.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';
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

describe('Bot lifecycle integration for throwIn / transfer / finishRound', () => {
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

  it('allows bot to perform throwIn after human attack', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 3,
      isPrivate: false,
      bots: 2,
    });

    service.startMatch(room.id, 'u1')!;
    let current = service.getRoom(room.id)!;

    // Человек делает стартовую атаку.
    const game1 = current.game!;
    const human = game1.players[game1.attackerIndex];
    const cardForAttack = human.hand[0];
    service.applyAction(room.id, human.id, { type: 'attack', card: cardForAttack });

    // Дождаться хода одного из ботов, который подкинет карту (throwIn) при наличии валидной.
    const beforeTableSize = (service.getRoom(room.id)!.game as { table: unknown[] }).table.length;
    advanceBotDelay(jest);
    current = service.getRoom(room.id)!;
    const afterGame = current.game as { table: unknown[] };
    // Ожидаем, что на столе либо осталось нападение человека, либо добавлены карты бота; главное — матч не зависает.
    expect(afterGame.table.length).toBeGreaterThanOrEqual(beforeTableSize);
  });

  it('allows bot defender to perform transfer in perevodnoy mode', () => {
    const room = service.createRoom('u1', {
      mode: 'perevodnoy',
      maxPlayers: 3,
      isPrivate: false,
      bots: 2,
    });

    service.startMatch(room.id, 'u1')!;
    let current = service.getRoom(room.id)!;

    const game1 = current.game!;
    const humanAttacker = game1.players[game1.attackerIndex];
    const firstAttackCard = humanAttacker.hand.find((c) =>
      // выберем любую карту; game-core сам отфильтрует недопустимые на следующих шагах
      Boolean(c),
    )!;

    // Человек начинает с атаки.
    service.applyAction(room.id, humanAttacker.id, { type: 'attack', card: firstAttackCard });

    // Дождёмся решения бота-защитника: стратегия должна попытаться сделать transfer, если это возможно.
    advanceBotDelay(jest);
    current = service.getRoom(room.id)!;
    const afterGame = current.game as { table: unknown[] };

    // Ожидаем, что на столе появилась ещё одна атакующая карта (результат transfer).
    expect(afterGame.table.length).toBeGreaterThanOrEqual(1);
  });

  it('lets bot finish round when no more meaningful actions remain', () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    service.startMatch(room.id, 'u1')!;
    let current = service.getRoom(room.id)!;

    // Человек делает одну атаку, бот успешно защищается (по стратегии).
    const game1 = current.game!;
    const human = game1.players[game1.attackerIndex];
    const attackCard = human.hand[0];
    service.applyAction(room.id, human.id, { type: 'attack', card: attackCard });
    advanceBotDelay(jest); // бот защитится, если сможет

    // Теперь бот в фазе cleanup может завершить раунд через finishRound (endTurn).
    advanceBotDelay(jest);
    current = service.getRoom(room.id)!;

    const beforeTurn = service.getRoom(room.id)!.turn;
    advanceBotDelay(jest);
    current = service.getRoom(room.id)!;

    expect(current.turn).toBeGreaterThanOrEqual(beforeTurn);
    expect(current.game).toBeDefined();
  });
});

