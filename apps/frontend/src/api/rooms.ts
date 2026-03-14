import { api } from './client';

export type RoomMode = 'podkidnoy' | 'perevodnoy';

export type RoomStatus = 'lobby' | 'in_progress' | 'finished';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface RoomPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isOwner: boolean;
  botProfile?: {
    profileId: string;
    strategyId: string;
    difficulty: BotDifficulty;
  } | null;
}

export interface GameCardDto {
  rank: string;
  suit: string;
}

export interface GameTablePairDto {
  attack: GameCardDto;
  defense?: GameCardDto;
}

export interface GameSnapshotDto {
  id: string;
  mode: RoomMode;
  players: { id: string; hand: GameCardDto[]; isBot: boolean; isOut: boolean }[];
  deck: GameCardDto[];
  discard: GameCardDto[];
  trump: string;
  attackerIndex: number;
  defenderIndex: number;
  phase: 'attack' | 'defense' | 'cleanup';
  table: GameTablePairDto[];
  pendingTake: boolean;
  finished: boolean;
  loserId?: string;
}

export interface PerPlayerMatchStatsDto {
  playerId: string;
  turnsMade: number;
  cardsTaken: number;
  defensesMade: number;
  attacksMade: number;
  transfersMade: number;
  throwInsMade: number;
  finishedPlace?: number;
}

export interface MatchStatsDto {
  totalTurns: number;
  totalRounds: number;
  durationSeconds: number;
  totalCardsTaken: number;
  perPlayer: PerPlayerMatchStatsDto[];
}

export type MatchOutcome = 'normal' | 'draw' | 'aborted';

export interface MatchResultDto {
  winnerIds: string[];
  loserId?: string | null;
  finishOrder: string[];
  placements: { playerId: string; place: number }[];
  outcome: MatchOutcome;
  stats: MatchStatsDto;
}

export interface RoomDto {
  id: string;
  mode: RoomMode;
  maxPlayers: number;
  ownerId: string;
  status: RoomStatus;
  isPrivate: boolean;
  inviteCode: string;
  players: RoomPlayer[];
  bots: RoomPlayer[];
  turn?: number;
  game?: GameSnapshotDto;
  matchResult?: MatchResultDto;
  turnStartedAt?: number;
  turnDurationSeconds?: number;
  turnTimeoutMs?: number;
  turnDeadlineAt?: number;
  lastAutoActionMessage?: string | null;
  overrideTurnTimeoutMs?: number;
  perPlayerTimeoutMs?: Record<string, number>;
}

export async function fetchRooms(token: string | null) {
  return api<RoomDto[]>('/rooms', { token });
}

export async function createRoom(
  body: {
    mode: RoomMode;
    maxPlayers: number;
    isPrivate: boolean;
    bots: number;
    botDifficulties?: BotDifficulty[];
  },
  token: string | null,
) {
  return api<RoomDto>('/rooms', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export async function joinRoom(id: string, token: string | null) {
  return api<RoomDto>(`/rooms/${id}/join`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}

export async function leaveRoom(id: string, token: string | null) {
  return api<RoomDto | null>(`/rooms/${id}/leave`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}

export async function getRoom(id: string, token: string | null) {
  return api<RoomDto | null>(`/rooms/${id}`, { token });
}

export async function startRoomMatch(id: string, token: string | null) {
  return api<RoomDto | null>(`/rooms/${id}/start`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}

export async function updateRoomTimeouts(
  id: string,
  body: { roomTimeoutMs?: number | null; perPlayerTimeoutMs?: Record<string, number | null> },
  token: string | null,
) {
  return api<RoomDto | null>(`/rooms/${id}/timeouts`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export async function updateBotProfile(
  roomId: string,
  botId: string,
  body: { difficulty: BotDifficulty },
  token: string | null,
) {
  return api<RoomDto | null>(`/rooms/${roomId}/bots/${botId}/profile`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

