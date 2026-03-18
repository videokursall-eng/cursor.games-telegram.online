import { describe, it, expect } from '@jest/globals';
import type { RoomState, RoomPlayer } from '../rooms/rooms.types';
import { buildBotContext } from './bots.adapter';
import type { BotProfile } from './bots.types';

function createPlayer(id: string, overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    id,
    name: `Player ${id}`,
    isBot: false,
    isOwner: false,
    ...overrides,
  };
}

describe('buildBotContext', () => {
  const baseRoom: RoomState = {
    id: 'room-1',
    mode: 'podkidnoy',
    maxPlayers: 4,
    players: [createPlayer('u1', { isOwner: true }), createPlayer('u2')],
    bots: [createPlayer('b1', { isBot: true })],
    ownerId: 'u1',
    status: 'in_progress',
    isPrivate: false,
    inviteCode: 'abc',
    turn: 3,
    game: {
      id: 'match-1',
      mode: 'podkidnoy',
      players: [
        { id: 'u1', hand: [], isBot: false, isOut: false },
        { id: 'u2', hand: [], isBot: false, isOut: false },
        { id: 'b1', hand: [], isBot: true, isOut: false },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      table: [],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    },
    matchResult: undefined,
    matchStats: {
      totalTurns: 0,
      totalRounds: 0,
      durationSeconds: 0,
      totalCardsTaken: 0,
      perPlayer: [],
    },
    matchStartedAt: Date.now(),
    turnStartedAt: Date.now(),
    turnDurationSeconds: 30,
    turnTimeoutMs: 30000,
    turnDeadlineAt: Date.now() + 30000,
    lastAutoActionMessage: null,
    overrideTurnTimeoutMs: undefined,
    perPlayerTimeoutMs: undefined,
  };

  it('returns null when game state is missing', () => {
    const roomWithoutGame: RoomState = { ...baseRoom, game: undefined };
    const ctx = buildBotContext(roomWithoutGame, 'b1', []);
    expect(ctx).toBeNull();
  });

  it('returns null when bot player is not found', () => {
    const ctx = buildBotContext(baseRoom, 'unknown-bot', []);
    expect(ctx).toBeNull();
  });

  it('builds context for bot from room.bots with default profile', () => {
    const ctx = buildBotContext(baseRoom, 'b1', []);
    expect(ctx).not.toBeNull();
    if (!ctx) return;
    expect(ctx.roomId).toBe('room-1');
    expect(ctx.mode).toBe('podkidnoy');
    expect(ctx.turn).toBe(3);
    expect(ctx.self.id).toBe('b1');
    expect(ctx.players.map((p) => p.id)).toEqual(['u1', 'u2', 'b1']);
    expect(ctx.bots).toHaveLength(1);
    expect(ctx.bots[0].player.id).toBe('b1');
    expect(ctx.bots[0].profile.strategyId).toBe('basic');
    expect(ctx.game.id).toBe('match-1');
  });

  it('uses provided BotProfile when available', () => {
    const profiles: BotProfile[] = [
      {
        id: 'b1',
        displayName: 'Aggro Bot',
        strategyId: 'aggro',
        difficulty: 'hard',
        config: {
          aggression: 0.9,
          defenseBias: 0.8,
          transferBias: 0.9,
          throwInBias: 0.8,
        },
      },
    ];
    const ctx = buildBotContext(baseRoom, 'b1', profiles);
    expect(ctx).not.toBeNull();
    if (!ctx) return;
    expect(ctx.bots[0].profile.displayName).toBe('Aggro Bot');
    expect(ctx.bots[0].profile.strategyId).toBe('aggro');
  });
});

