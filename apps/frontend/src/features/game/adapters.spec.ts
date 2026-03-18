import { describe, it, expect } from 'vitest';
import { adaptRoomToGameTableState } from './adapters';
import type { RoomDto } from '../../api/rooms';

function roomWithGame(overrides: {
  currentUserId: string;
  attackerIndex: number;
  defenderIndex: number;
  phase: 'attack' | 'defense' | 'cleanup';
  playerIds?: [string, string];
  playerIsBots?: [boolean, boolean];
}): RoomDto {
  const playerIds = overrides.playerIds ?? ['human', 'bot-1'];
  const playerIsBots = overrides.playerIsBots ?? [false, true];
  return {
    id: 'room-1',
    mode: 'podkidnoy',
    maxPlayers: 2,
    ownerId: playerIds[0],
    status: 'in_progress',
    isPrivate: false,
    inviteCode: 'CODE',
    players: playerIds
      .filter((_, i) => !playerIsBots[i])
      .map((id) => ({
        id,
        name: id === 'human' ? 'Human' : id,
        isBot: false,
        isOwner: id === playerIds[0],
      })),
    bots: playerIds
      .filter((_, i) => playerIsBots[i])
      .map((id) => ({
        id,
        name: id,
        isBot: true,
        isOwner: false,
        botProfile: { profileId: 'p1', strategyId: 'basic', difficulty: 'normal' as const },
      })),
    game: {
      id: 'game-1',
      mode: 'podkidnoy',
      players: playerIds.map((id, i) => ({
        id,
        hand: [{ rank: '6', suit: 'hearts' }, { rank: '7', suit: 'spades' }],
        isBot: playerIsBots[i],
        isOut: false,
      })),
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: overrides.attackerIndex,
      defenderIndex: overrides.defenderIndex,
      phase: overrides.phase,
      table: [],
      pendingTake: false,
      finished: false,
    },
  };
}

describe('adaptRoomToGameTableState (bot / isActive)', () => {
  it('sets currentPlayer.isActive when it is human turn (attack phase)', () => {
    const room = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const state = adaptRoomToGameTableState(room, 'human');
    expect(state.currentPlayer.isActive).toBe(true);
    expect(state.opponents.find((o) => o.id === 'bot-1')?.isActive).toBe(false);
  });

  it('sets currentPlayer.isActive false when it is bot turn (attack phase)', () => {
    const room = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 1,
      defenderIndex: 0,
      phase: 'attack',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const state = adaptRoomToGameTableState(room, 'human');
    expect(state.currentPlayer.isActive).toBe(false);
    expect(state.opponents.find((o) => o.id === 'bot-1')?.isActive).toBe(true);
  });

  it('sets currentPlayer.isActive when human is defender (defense phase)', () => {
    const room = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 1,
      defenderIndex: 0,
      phase: 'defense',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const state = adaptRoomToGameTableState(room, 'human');
    expect(state.currentPlayer.isActive).toBe(true);
    expect(state.opponents.find((o) => o.id === 'bot-1')?.isActive).toBe(false);
  });

  it('sets currentPlayer.isActive false when bot is defender (defense phase)', () => {
    const room = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'defense',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const state = adaptRoomToGameTableState(room, 'human');
    expect(state.currentPlayer.isActive).toBe(false);
    expect(state.opponents.find((o) => o.id === 'bot-1')?.isActive).toBe(true);
  });

  it('shows bot opponent with isBot and cardCount', () => {
    const room = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const state = adaptRoomToGameTableState(room, 'human');
    expect(state.opponents).toHaveLength(1);
    expect(state.opponents[0].id).toBe('bot-1');
    expect(state.opponents[0].isBot).toBe(true);
    expect(state.opponents[0].cardCount).toBe(2);
  });
});

describe('smoke: room with bot, state before and after bot action', () => {
  it('state reflects bot turn (no actions for human) then human turn after "bot action"', () => {
    const roomBeforeBotAction = roomWithGame({
      currentUserId: 'human',
      attackerIndex: 1,
      defenderIndex: 0,
      phase: 'attack',
      playerIds: ['human', 'bot-1'],
      playerIsBots: [false, true],
    });
    const stateBefore = adaptRoomToGameTableState(roomBeforeBotAction, 'human');
    expect(stateBefore.currentPlayer.isActive).toBe(false);
    expect(stateBefore.phase).toBe('attack');

    const roomAfterBotAction: RoomDto = {
      ...roomBeforeBotAction,
      game: roomBeforeBotAction.game
        ? {
            ...roomBeforeBotAction.game,
            attackerIndex: 1,
            defenderIndex: 0,
            phase: 'defense',
            table: [
              { attack: { rank: '6', suit: 'hearts' }, defense: undefined },
            ],
            players: roomBeforeBotAction.game.players.map((p, i) =>
              i === 1
                ? { ...p, hand: p.hand.slice(1) }
                : p,
            ),
          }
        : undefined,
    };
    const stateAfter = adaptRoomToGameTableState(roomAfterBotAction, 'human');
    expect(stateAfter.currentPlayer.isActive).toBe(true);
    expect(stateAfter.phase).toBe('defense');
    expect(stateAfter.battlePairs).toHaveLength(1);
    expect(stateAfter.battlePairs[0].attack.rank).toBe('6');
    expect(stateAfter.opponents.find((o) => o.id === 'bot-1')?.cardCount).toBe(1);
  });
});
