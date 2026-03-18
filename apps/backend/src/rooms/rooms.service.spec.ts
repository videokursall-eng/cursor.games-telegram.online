import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RoomsService } from './rooms.service';
import type { RealtimeService } from '../realtime/realtime.service';
import type { RoomState } from './rooms.types';
import { advanceTurnTimeout } from '../test/timer-helpers';
import type { StructuredLoggerService } from '../logging/structured-logger.service';

const mockStatsService = { recordMatchComplete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };

jest.mock('game-core', () => {
  return {
    createDeck: jest.fn(() => [{ rank: '6', suit: 'hearts' }]),
    createInitialState: jest.fn((id: string, mode: string, playerIds: string[]) => ({
      id,
      mode,
      players: playerIds.map((pid) => ({ id: pid })),
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      table: [],
      pendingTake: false,
      finished: false,
    })),
    applyCommand: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applyCommand } = require('game-core') as { applyCommand: jest.Mock };

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
  const service = new RoomsService(realtime, mockStatsService as never, logger);
  (service as unknown as { __loggerMock: StructuredLoggerService; __realtimeMock: RealtimeService }).__loggerMock =
    logger;
  (service as unknown as { __loggerMock: StructuredLoggerService; __realtimeMock: RealtimeService }).__realtimeMock =
    realtime;
  return service;
}

describe('RoomsService bots in room lifecycle', () => {
  it('creates room with bots and includes them in room snapshots', () => {
    const service = createService();
    const realtime = (service as unknown as { __realtimeMock: RealtimeService }).__realtimeMock;
    const room = service.createRoom('owner-1', {
      mode: 'podkidnoy',
      maxPlayers: 4,
      isPrivate: false,
      bots: 2,
    });

    expect(room.bots).toHaveLength(2);
    expect(room.players).toHaveLength(1);
    expect(room.maxPlayers).toBe(4);

    const calls = (realtime.broadcastRoomSnapshot as jest.Mock).mock.calls;
    const snapshotCall = calls.find(([roomId]) => roomId === room.id);
    expect(snapshotCall).toBeDefined();
    const [, snapshot] = snapshotCall!;
    expect(snapshot).toEqual(
      expect.objectContaining({
        bots: expect.arrayContaining([
          expect.objectContaining({
            isBot: true,
            type: 'bot',
            botProfile: expect.objectContaining({
              profileId: expect.stringMatching(/(easy|normal|hard)-\d+/),
              strategyId: expect.any(String),
              difficulty: expect.stringMatching(/easy|normal|hard/),
            }),
          }),
        ]),
      }),
    );
  });

  it('logs room creation with roomId and matchId', () => {
    const service = createService();
    const logger = (service as unknown as { __loggerMock: StructuredLoggerService }).__loggerMock;
    const room = service.createRoom('owner-log', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 0,
    });

    expect(logger.info).toHaveBeenCalledWith(
      'room_created',
      expect.objectContaining({
        roomId: room.id,
        matchId: room.id,
        userId: 'owner-log',
      }),
    );
  });

  it('uses botDifficulties when provided at creation', () => {
    const service = createService();
    const room = service.createRoom('owner-1', {
      mode: 'podkidnoy',
      maxPlayers: 4,
      isPrivate: false,
      bots: 3,
      botDifficulties: ['hard', 'easy', 'normal'],
    });

    expect(room.bots).toHaveLength(3);
    expect(room.bots[0].botProfile?.difficulty).toBe('hard');
    expect(room.bots[1].botProfile?.difficulty).toBe('easy');
    expect(room.bots[2].botProfile?.difficulty).toBe('normal');
  });

  it('updateBotProfile updates bot difficulty and room snapshot', () => {
    const service = createService();
    const realtime = (service as unknown as { __realtimeMock: RealtimeService }).__realtimeMock;
    const room = service.createRoom('owner-1', {
      mode: 'podkidnoy',
      maxPlayers: 4,
      isPrivate: false,
      bots: 1,
    });

    const botId = room.bots[0].id;
    expect(room.bots[0].botProfile?.difficulty).toBe('easy');

    const updated = service.updateBotProfile(room.id, 'owner-1', botId, { difficulty: 'hard' });
    expect(updated).toBeDefined();
    expect(updated!.bots[0].botProfile?.difficulty).toBe('hard');

    const getAgain = service.getRoom(room.id);
    expect(getAgain?.bots[0].botProfile?.difficulty).toBe('hard');

    const calls = (realtime.broadcastRoomSnapshot as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1] as [string, RoomState];
    expect(lastCall[1].bots[0].botProfile?.difficulty).toBe('hard');
  });
});

describe('RoomsService match result and stats', () => {
  let service: RoomsService;

  beforeEach(() => {
    service = createService();
    applyCommand.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    service.clearAllTimers();
    jest.useRealTimers();
  });

  it('computes winnerIds and loserId in matchResult for finished game', async () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });

    const started = service.startMatch(room.id, 'u1')!;
    const botId = started.bots[0].id;

    applyCommand.mockReturnValue(
      Object.assign({}, started.game, {
        finished: true,
        loserId: botId,
        stats: {
          totalTurns: 1,
          totalRounds: 1,
          totalCardsTaken: 0,
          finishOrder: ['u1', botId],
          perPlayer: [
            {
              playerId: 'u1',
              turnsMade: 1,
              cardsTaken: 0,
              defensesMade: 0,
              attacksMade: 1,
              transfersMade: 0,
              throwInsMade: 0,
              finishedPlace: 1,
            },
            {
              playerId: botId,
              turnsMade: 0,
              cardsTaken: 0,
              defensesMade: 0,
              attacksMade: 0,
              transfersMade: 0,
              throwInsMade: 0,
              finishedPlace: 2,
            },
          ],
          outcome: 'normal',
        },
        players: [
          { id: 'u1', isOut: true },
          { id: botId, isOut: false },
        ],
        table: [],
      }),
    );

    const after = (await service.applyAction(room.id, 'u1', { type: 'finish' }))!;

    expect(after.matchResult).toBeDefined();
    expect(after.matchResult!.loserId).toBe(botId);
    expect(after.matchResult!.finishOrder.length).toBeGreaterThanOrEqual(1);
  });

  it('accumulates basic match statistics', async () => {
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const botId = started.bots[0].id;

    // simulate one take with two cards on table
    applyCommand.mockImplementationOnce((game: Record<string, unknown>) => ({
      ...(game || {}),
      table: [
        { attack: { rank: '6', suit: 'hearts' }, defense: { rank: '7', suit: 'hearts' } },
      ],
      finished: false,
      loserId: undefined,
    }));
    await service.applyAction(room.id, 'u1', { type: 'take' });

    // finish game
    applyCommand.mockImplementationOnce((game: Record<string, unknown>) => ({
      ...(game || {}),
      finished: true,
      loserId: botId,
      players: [
        { id: 'u1', isOut: true },
        { id: botId, isOut: false },
      ],
      table: [],
    }));
    const finished = (await service.applyAction(room.id, 'u1', { type: 'finish' }))!;

    expect(finished.matchResult).toBeDefined();
    const stats = finished.matchResult!.stats;
    expect(stats.totalTurns).toBeGreaterThanOrEqual(1);
    expect(stats.totalRounds).toBeGreaterThanOrEqual(0);
    expect(stats.totalCardsTaken).toBeGreaterThanOrEqual(0);
    expect(stats.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('logs game_action_invalid when applyCommand throws', async () => {
    const serviceWithLogger = createService();
    const logger = (serviceWithLogger as unknown as { __loggerMock: StructuredLoggerService }).__loggerMock;
    const room = serviceWithLogger.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    serviceWithLogger.startMatch(room.id, 'u1')!;

    applyCommand.mockImplementationOnce(() => {
      throw new Error('invalid_move');
    });

    await expect(
      serviceWithLogger.applyAction(room.id, 'u1', { type: 'attack', card: { rank: '6', suit: 'hearts' } }),
    ).rejects.toThrow('invalid_move');

    expect(logger.warn).toHaveBeenCalledWith(
      'game_action_invalid',
      expect.objectContaining({
        roomId: room.id,
        userId: 'u1',
        action: 'attack',
        reason: 'invalid_move',
      }),
    );
  });

  it('logs game command application with roomId and matchId', async () => {
    const serviceWithLogger = createService();
    const logger = (serviceWithLogger as unknown as { __loggerMock: StructuredLoggerService }).__loggerMock;
    const room = serviceWithLogger.createRoom('u-log', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = serviceWithLogger.startMatch(room.id, 'u-log')!;

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    await serviceWithLogger.applyAction(started.id, 'u-log', { type: 'attack', card: { rank: '6', suit: 'hearts' } });

    expect(logger.info).toHaveBeenCalledWith(
      'game_command_applied',
      expect.objectContaining({
        roomId: started.id,
        matchId: expect.any(String),
        action: 'attack',
      }),
    );
  });

  it('does not apply HTTP action twice for same clientCommandId and logs duplicate event', async () => {
    const serviceWithLogger = createService();
    const logger = (serviceWithLogger as unknown as { __loggerMock: StructuredLoggerService }).__loggerMock;
    const room = serviceWithLogger.createRoom('u-http', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = serviceWithLogger.startMatch(room.id, 'u-http')!;

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    await serviceWithLogger.applyAction(started.id, 'u-http', {
      type: 'attack',
      card: { rank: '6', suit: 'hearts' },
      clientCommandId: 'http-cmd-1',
    });

    const callsBeforeDuplicate = applyCommand.mock.calls.length;

    // duplicate HTTP action with same clientCommandId should be idempotent
    await serviceWithLogger.applyAction(started.id, 'u-http', {
      type: 'attack',
      card: { rank: '6', suit: 'hearts' },
      clientCommandId: 'http-cmd-1',
    });

    const callsAfterDuplicate = applyCommand.mock.calls.length;
    expect(callsAfterDuplicate).toBe(callsBeforeDuplicate);

    expect(logger.info).toHaveBeenCalledWith(
      'game_action_duplicate_http',
      expect.objectContaining({
        roomId: started.id,
        userId: 'u-http',
        clientCommandId: 'http-cmd-1',
        action: 'attack',
      }),
    );
  });

  it('resolves timeout per mode and overrides in correct order', async () => {
    process.env.DURAK_TURN_TIMEOUT_MS = '30000';
    process.env.DURAK_TURN_TIMEOUT_PODKIDNOY_MS = '10000';
    process.env.DURAK_TURN_TIMEOUT_PEREVODNOY_MS = '20000';

    const localService = createService();

    // podkidnoy mode uses its own timeout
    const roomPod = localService.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const startedPod = localService.startMatch(roomPod.id, 'u1')!;
    expect(startedPod.turnTimeoutMs).toBe(10_000);

    // perevodnoy mode uses its own timeout
    const roomPer = localService.createRoom('u2', {
      mode: 'perevodnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const startedPer = localService.startMatch(roomPer.id, 'u2')!;
    expect(startedPer.turnTimeoutMs).toBe(20_000);

    // Room override wins over mode timeout
    roomPod.overrideTurnTimeoutMs = 15_000;
    localService.startMatch(roomPod.id, 'u1');
    const updatedRoom = localService.getRoom(roomPod.id)!;
    expect(updatedRoom.turnTimeoutMs).toBe(15_000);

    // Per-player override wins over room override for active attacker.
    updatedRoom.perPlayerTimeoutMs = { [updatedRoom.ownerId]: 5_000 };
    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));
    await localService.applyAction(updatedRoom.id, updatedRoom.ownerId, { type: 'finish' });
    const after = localService.getRoom(updatedRoom.id)!;
    expect(after.turnTimeoutMs).toBe(5_000);
    localService.clearAllTimers();
  });

  it('uses configurable turn timeout and schedules auto take for defender on defense timeout', () => {
    jest.useFakeTimers();
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const botId = started.bots[0].id;

    // Имитируем состояние защиты: бот защищается.
    (started as { game?: Record<string, unknown> }).game = {
      ...(started.game || {}),
      players: [{ id: 'u1' }, { id: botId }],
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'defense',
      pendingTake: false,
      finished: false,
      table: [{ attack: { rank: '6', suit: 'hearts' } }],
    };

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    // Должен сработать auto-take для защищающегося по истечении таймаута.
    advanceTurnTimeout(jest);

    expect(applyCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'take', playerId: botId }),
    );
  });

  it('schedules auto endTurn on cleanup timeout', () => {
    jest.useFakeTimers();
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const botId = started.bots[0].id;

    (started as { game?: Record<string, unknown> }).game = {
      ...(started.game || {}),
      players: [{ id: 'u1' }, { id: botId }],
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'cleanup',
      pendingTake: false,
      finished: false,
      table: [],
    };

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    advanceTurnTimeout(jest);

    expect(applyCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'endTurn', playerId: 'u1' }),
    );
  });

  it('uses auto endTurn instead of take when defender already decided to take (pendingTake)', () => {
    jest.useFakeTimers();
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;
    const botId = started.bots[0].id;

    (started as { game?: Record<string, unknown> }).game = {
      ...(started.game || {}),
      players: [{ id: 'u1' }, { id: botId }],
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'defense',
      pendingTake: true,
      finished: false,
      table: [{ attack: { rank: '6', suit: 'hearts' } }],
    };

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    advanceTurnTimeout(jest);

    expect(applyCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'endTurn', playerId: 'u1' }),
    );
  });

  it('applies throwInPass on attack-phase throw-in timeout', () => {
    jest.useFakeTimers();
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 3,
      isPrivate: false,
      bots: 2,
    });
    const started = service.startMatch(room.id, 'u1')!;

    (started as { game?: Record<string, unknown> }).game = {
      ...(started.game || {}),
      players: [{ id: 'u1' }, { id: started.bots[0].id }, { id: started.bots[1].id }],
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      pendingTake: false,
      finished: false,
      table: [{ attack: { rank: '6', suit: 'hearts' } }],
    };

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    advanceTurnTimeout(jest);

    expect(applyCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'throwInPass', playerId: 'u1' }),
    );
  });

  it('applies auto endTurn (pass) on initial attack timeout', () => {
    jest.useFakeTimers();
    const room = service.createRoom('u1', {
      mode: 'podkidnoy',
      maxPlayers: 2,
      isPrivate: false,
      bots: 1,
    });
    const started = service.startMatch(room.id, 'u1')!;

    (started as { game?: Record<string, unknown> }).game = {
      ...(started.game || {}),
      players: [{ id: 'u1' }, { id: started.bots[0].id }],
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      pendingTake: false,
      finished: false,
      table: [],
    };

    applyCommand.mockImplementation((game: Record<string, unknown>, command: { type: string; playerId: string }) => ({
      ...(game || {}),
      lastCommand: command,
      finished: false,
    }));

    advanceTurnTimeout(jest);

    expect(applyCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'endTurn', playerId: 'u1' }),
    );
  });
});

