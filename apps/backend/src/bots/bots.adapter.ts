import type { RoomState, RoomPlayer } from '../rooms/rooms.types';
import type { BotContext, BotParticipant, BotProfile } from './bots.types';

export function buildBotContext(room: RoomState, botPlayerId: string, profiles: BotProfile[]): BotContext | null {
  if (!room.game) return null;

  const self = room.players.find((p) => p.id === botPlayerId) ?? room.bots.find((b) => b.id === botPlayerId);
  if (!self) return null;

  const players: RoomPlayer[] = [...room.players, ...room.bots];

  const bots: BotParticipant[] = room.bots.map((bot) => {
    const fromRoom = bot.botProfile;
    const profile =
      profiles.find((p) => p.id === bot.id) ??
      (fromRoom
        ? {
            id: bot.id,
            displayName: bot.name,
            strategyId: fromRoom.strategyId,
            difficulty: fromRoom.difficulty,
            config: {
              aggression: fromRoom.difficulty === 'hard' ? 0.8 : fromRoom.difficulty === 'easy' ? 0.3 : 0.5,
              defenseBias: fromRoom.difficulty === 'hard' ? 0.8 : fromRoom.difficulty === 'easy' ? 0.4 : 0.6,
              transferBias: fromRoom.difficulty === 'hard' ? 0.9 : fromRoom.difficulty === 'easy' ? 0.2 : 0.6,
              throwInBias: fromRoom.difficulty === 'hard' ? 0.8 : fromRoom.difficulty === 'easy' ? 0.3 : 0.6,
            },
          }
        : {
            id: bot.id,
            displayName: bot.name,
            strategyId: 'basic',
            difficulty: 'normal',
            config: {
              aggression: 0.5,
              defenseBias: 0.5,
              transferBias: 0.7,
              throwInBias: 0.6,
            },
          });

    return { player: bot, profile };
  });

  return {
    roomId: room.id,
    mode: room.mode,
    turn: room.turn,
    self,
    players,
    bots,
    game: room.game,
  };
}

