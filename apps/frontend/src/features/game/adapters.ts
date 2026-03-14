import type { RoomDto, GameSnapshotDto, MatchResultDto } from '../../api/rooms';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface GameCard {
  id: string;
  rank: string;
  suit: Suit;
  playable: boolean;
}

export type GamePhase = 'attack' | 'defense' | 'cleanup' | 'waiting' | 'finished';

export interface GamePlayerView {
  id: string;
  name: string;
  isBot: boolean;
  cardCount: number;
  isCurrent: boolean;
  isActive: boolean;
}

export interface BattlePairView {
  attack: GameCard;
  defense?: GameCard;
}

export interface GameTableState {
  roomId: string;
  mode: 'podkidnoy' | 'perevodnoy';
  phase: GamePhase;
  currentPlayer: GamePlayerView;
  opponents: GamePlayerView[];
  hand: GameCard[];
  battlePairs: BattlePairView[];
  deckCount: number;
  trump: GameCard;
  isFinished: boolean;
  hint: string;
  matchResult?: MatchResultDto;
  turnStartedAt?: number;
  turnDurationSeconds?: number;
  turnTimeoutMs?: number;
  turnDeadlineAt?: number;
  systemMessage?: string | null;
}

export interface GameTableMeta {
  loading: boolean;
  error: string | null;
  syncing: boolean;
  reconnecting: boolean;
  offline: boolean;
  stale: boolean;
}

function mapPhase(game: GameSnapshotDto | undefined, roomStatus: RoomDto['status']): GamePhase {
  if (roomStatus === 'finished' || game?.finished) return 'finished';
  if (!game) return roomStatus === 'in_progress' ? 'attack' : 'waiting';
  if (game.phase === 'attack') return 'attack';
  if (game.phase === 'defense') return 'defense';
  return 'cleanup';
}

export function adaptRoomToGameTableState(room: RoomDto, userId: string): GameTableState {
  const allPlayers = [...room.players, ...room.bots];
  const currentRaw = allPlayers.find((p) => p.id === userId) ?? allPlayers[0];

  const game = room.game;

  let hand: GameCard[] = [];
  let battlePairs: BattlePairView[] = [];
  let deckCount = 0;
  let trumpSuit: Suit = 'diamonds';

  if (game) {
    const gamePlayer = game.players.find((p) => p.id === currentRaw?.id) ?? game.players[0];
    hand = gamePlayer.hand.map((c, idx) => ({
      id: `${room.id}:${gamePlayer.id}:${c.rank}:${c.suit}:${idx}`,
      rank: c.rank,
      suit: c.suit as Suit,
      playable: true,
    }));
    battlePairs = game.table.map((p, idx) => ({
      attack: {
        id: `${room.id}:attack:${idx}`,
        rank: p.attack.rank,
        suit: p.attack.suit as Suit,
        playable: false,
      },
      defense: p.defense
        ? {
            id: `${room.id}:defense:${idx}`,
            rank: p.defense.rank,
            suit: p.defense.suit as Suit,
            playable: false,
          }
        : undefined,
    }));
    deckCount = game.deck.length;
    trumpSuit = game.trump as Suit;
  }

  const phase = mapPhase(game, room.status);

  const activePlayerIndex =
    game && game.phase
      ? game.phase === 'defense'
        ? game.defenderIndex
        : game.attackerIndex
      : -1;
  const activePlayerId =
    game && activePlayerIndex >= 0 && game.players[activePlayerIndex]
      ? game.players[activePlayerIndex].id
      : null;

  const current: GamePlayerView = {
    id: currentRaw?.id ?? 'unknown',
    name: currentRaw?.name ?? 'Вы',
    isBot: currentRaw?.isBot ?? false,
    cardCount: hand.length,
    isCurrent: true,
    isActive: activePlayerId === (currentRaw?.id ?? ''),
  };

  const opponents: GamePlayerView[] = allPlayers
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const gamePlayer = game?.players.find((gp) => gp.id === p.id);
      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        cardCount: gamePlayer ? gamePlayer.hand.length : 0,
        isCurrent: false,
        isActive: activePlayerId === p.id,
      };
    });

  const matchResult: GameTableState['matchResult'] = room.matchResult ?? undefined;

  return {
    roomId: room.id,
    mode: room.mode,
    phase,
    currentPlayer: current,
    opponents,
    hand,
    battlePairs,
    deckCount,
    trump: {
      id: `${room.id}:trump`,
      rank: 'A',
      suit: trumpSuit,
      playable: false,
    },
    isFinished: room.status === 'finished' || !!game?.finished,
    matchResult,
    hint: '',
    turnStartedAt: room.turnStartedAt ?? (room.turnDeadlineAt && room.turnTimeoutMs ? room.turnDeadlineAt - room.turnTimeoutMs : undefined),
    turnDurationSeconds: room.turnTimeoutMs ? Math.floor(room.turnTimeoutMs / 1000) : room.turnDurationSeconds,
    turnTimeoutMs: room.turnTimeoutMs,
    turnDeadlineAt: room.turnDeadlineAt,
    systemMessage: room.lastAutoActionMessage ?? null,
  };
}

