import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { validateInitData } from '../middleware/auth';
import {
  addPlayerToRoom,
  createRoom,
  deleteRoom,
  getRoom,
  removePlayerFromRoom,
  updateRoom,
} from '../store/rooms';
import { attack, defend, pass, stateForPlayer, take, transfer } from '../game/durak';
import { createGame } from '../game/durak';
import { getBotAction } from '../game/bot';
import { Card, GameState, Room, RoomPlayer } from '../game/types';

const BOT_NAMES = [
  'Петя-Бот', 'Вася-Бот', 'Колян-Бот', 'Серёга-Бот', 'Игорёк-Бот',
];

export function setupSocket(io: Server): void {
  io.use((socket, next) => {
    const initData = socket.handshake.auth.initData as string;

    if (!initData) {
      // In dev mode allow connection without auth
      if (config.isDev) {
        socket.data.user = {
          id: Math.floor(Math.random() * 100000),
          first_name: 'TestUser',
          username: 'testuser',
        };
        return next();
      }
      return next(new Error('No initData'));
    }

    try {
      const validated = validateInitData(initData, config.botToken);
      socket.data.user = validated.user;
      socket.data.startParam = validated.start_param;
      next();
    } catch (e) {
      next(new Error('Invalid initData'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id} user=${socket.data.user?.id}`);

    socket.on('room:join', (roomId: string, cb?: (res: unknown) => void) => {
      handleJoinRoom(io, socket, roomId, cb);
    });

    socket.on('room:leave', (cb?: (res: unknown) => void) => {
      handleLeaveRoom(io, socket, cb);
    });

    socket.on('room:create', (
      params: { gameType: 'classic' | 'transfer'; maxPlayers: number; botCount: number },
      cb?: (res: unknown) => void,
    ) => {
      handleCreateRoom(io, socket, params, cb);
    });

    socket.on('game:start', (cb?: (res: unknown) => void) => {
      handleStartGame(io, socket, cb);
    });

    socket.on('game:attack', (cards: Card[], cb?: (res: unknown) => void) => {
      handleGameAction(io, socket, 'attack', { cards }, cb);
    });

    socket.on('game:defend', (defCard: Card, attackCard: Card, cb?: (res: unknown) => void) => {
      handleGameAction(io, socket, 'defend', { defCard, attackCard }, cb);
    });

    socket.on('game:transfer', (cards: Card[], cb?: (res: unknown) => void) => {
      handleGameAction(io, socket, 'transfer', { cards }, cb);
    });

    socket.on('game:take', (cb?: (res: unknown) => void) => {
      handleGameAction(io, socket, 'take', {}, cb);
    });

    socket.on('game:pass', (cb?: (res: unknown) => void) => {
      handleGameAction(io, socket, 'pass', {}, cb);
    });

    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function handleCreateRoom(
  io: Server,
  socket: Socket,
  params: { gameType: 'classic' | 'transfer'; maxPlayers: number; botCount: number },
  cb?: (res: unknown) => void,
): void {
  const user = socket.data.user;
  const creator: RoomPlayer = {
    id: String(user.id),
    name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
    photoUrl: user.photo_url,
    isBot: false,
    isReady: true,
    socketId: socket.id,
  };

  const maxPlayers = Math.min(Math.max(params.maxPlayers || 2, 2), 6);
  const botCount = Math.min(Math.max(params.botCount || 0, 0), maxPlayers - 1);

  const room = createRoom({ gameType: params.gameType, maxPlayers, botCount, creator });
  socket.join(room.id);
  socket.data.roomId = room.id;

  const inviteLink = `https://t.me/${config.botUsername}/${config.appName}?startapp=${room.id}`;
  const response = { room: { ...room, inviteLink } };
  cb?.(response);
  io.to(room.id).emit('room:updated', response.room);
}

function handleJoinRoom(
  io: Server,
  socket: Socket,
  roomId: string,
  cb?: (res: unknown) => void,
): void {
  const room = getRoom(roomId);
  if (!room) return cb?.({ error: 'Room not found' });
  if (room.status !== 'waiting') return cb?.({ error: 'Game already started' });

  const user = socket.data.user;
  const player: RoomPlayer = {
    id: String(user.id),
    name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
    photoUrl: user.photo_url,
    isBot: false,
    isReady: true,
    socketId: socket.id,
  };

  const updated = addPlayerToRoom(roomId, player);
  if (!updated) return cb?.({ error: 'Cannot join room' });

  socket.join(roomId);
  socket.data.roomId = roomId;

  const inviteLink = `https://t.me/${config.botUsername}/${config.appName}?startapp=${roomId}`;
  const response = { room: { ...updated, inviteLink } };
  cb?.(response);
  io.to(roomId).emit('room:updated', response.room);
  io.to(roomId).emit('player:joined', player);
}

function handleLeaveRoom(io: Server, socket: Socket, cb?: (res: unknown) => void): void {
  const roomId = socket.data.roomId as string;
  if (!roomId) return cb?.({ ok: true });

  const userId = String(socket.data.user.id);
  const room = removePlayerFromRoom(roomId, userId);
  socket.leave(roomId);
  socket.data.roomId = undefined;

  if (room) {
    const inviteLink = `https://t.me/${config.botUsername}/${config.appName}?startapp=${roomId}`;
    io.to(roomId).emit('room:updated', { ...room, inviteLink });
    io.to(roomId).emit('player:left', { id: userId });
  }
  cb?.({ ok: true });
}

function handleStartGame(io: Server, socket: Socket, cb?: (res: unknown) => void): void {
  const roomId = socket.data.roomId as string;
  if (!roomId) return cb?.({ error: 'Not in a room' });

  const room = getRoom(roomId);
  if (!room) return cb?.({ error: 'Room not found' });
  if (room.status !== 'waiting') return cb?.({ error: 'Game already started' });
  if (room.createdBy !== String(socket.data.user.id)) return cb?.({ error: 'Only creator can start' });

  const humanCount = room.players.length;
  const totalPlayers = humanCount + room.botCount;
  if (totalPlayers < 2) return cb?.({ error: 'Need at least 2 players' });

  // Build player list with bots
  const gamePlayers = [
    ...room.players.map((p) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photoUrl,
      isBot: false,
    })),
    ...Array.from({ length: room.botCount }, (_, i) => ({
      id: `bot-${i + 1}`,
      name: BOT_NAMES[i] || `Bot ${i + 1}`,
      isBot: true,
    })),
  ];

  const gameState = createGame(gamePlayers, room.gameType);
  room.status = 'playing';
  room.gameState = gameState;
  updateRoom(room);

  cb?.({ ok: true });
  io.to(roomId).emit('game:started', { roomId });

  // Emit personalized state to each player
  emitGameState(io, room);

  // Trigger bots if first attacker is a bot
  setTimeout(() => processBotTurns(io, room), 1000);
}

function handleGameAction(
  io: Server,
  socket: Socket,
  action: string,
  params: Record<string, unknown>,
  cb?: (res: unknown) => void,
): void {
  const roomId = socket.data.roomId as string;
  if (!roomId) return cb?.({ error: 'Not in a room' });

  const room = getRoom(roomId);
  if (!room || !room.gameState) return cb?.({ error: 'Game not found' });
  if (room.status !== 'playing') return cb?.({ error: 'Game not playing' });

  const playerId = String(socket.data.user.id);
  let result;

  switch (action) {
    case 'attack':
      result = attack(room.gameState, playerId, params.cards as Card[]);
      break;
    case 'defend':
      result = defend(room.gameState, playerId, params.defCard as Card, params.attackCard as Card);
      break;
    case 'transfer':
      result = transfer(room.gameState, playerId, params.cards as Card[]);
      break;
    case 'take':
      result = take(room.gameState, playerId);
      break;
    case 'pass':
      result = pass(room.gameState, playerId);
      break;
    default:
      return cb?.({ error: 'Unknown action' });
  }

  if (!result.ok) return cb?.({ error: result.error });

  room.gameState = result.state;
  if (result.state.phase === 'finished') {
    room.status = 'finished';
  }
  updateRoom(room);

  cb?.({ ok: true });
  io.to(roomId).emit('game:action', { action, playerId });
  emitGameState(io, room);

  if (result.state.phase === 'finished') {
    io.to(roomId).emit('game:over', {
      loser: result.state.loser,
      players: result.state.players.map((p) => ({ id: p.id, name: p.name, isOut: p.isOut })),
    });
    return;
  }

  // Trigger bots after player action
  setTimeout(() => processBotTurns(io, room), 800);
}

function handleDisconnect(io: Server, socket: Socket): void {
  console.log(`[socket] disconnected: ${socket.id}`);
  const roomId = socket.data.roomId as string;
  if (!roomId) return;

  const userId = String(socket.data.user?.id);
  // Don't remove immediately - give time to reconnect
  setTimeout(() => {
    const room = getRoom(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === userId);
    if (player && player.socketId === socket.id) {
      handleLeaveRoom(io, socket);
    }
  }, 30_000);
}

// ─── Bot processing ───────────────────────────────────────────────────────────

function processBotTurns(io: Server, room: Room): void {
  if (!room.gameState || room.status !== 'playing') return;

  const state = room.gameState;
  if (state.phase === 'finished') return;

  // Find which bot should act
  let botId: string | null = null;

  if (state.phase === 'attacking') {
    const attacker = state.players[state.attackerIndex];
    if (attacker.status === 'bot') botId = attacker.id;
    else {
      // Check co-attackers
      const coAttacker = state.players.find(
        (p, i) => p.status === 'bot' && i !== state.defenderIndex && !p.isOut,
      );
      if (coAttacker) botId = coAttacker.id;
    }
  } else if (state.phase === 'defending') {
    const defender = state.players[state.defenderIndex];
    if (defender.status === 'bot') botId = defender.id;
  }

  if (!botId) return;

  const action = getBotAction(state, botId);
  if (!action) return;

  let result;
  switch (action.type) {
    case 'attack':
      result = attack(state, botId, action.cards);
      break;
    case 'defend':
      result = defend(state, botId, action.defCard, action.attackCard);
      break;
    case 'transfer':
      result = transfer(state, botId, action.cards);
      break;
    case 'take':
      result = take(state, botId);
      break;
    case 'pass':
      result = pass(state, botId);
      break;
  }

  if (!result || !result.ok) return;

  room.gameState = result.state;
  if (result.state.phase === 'finished') {
    room.status = 'finished';
  }
  updateRoom(room);

  io.to(room.id).emit('game:action', { action: action.type, playerId: botId });
  emitGameState(io, room);

  if (result.state.phase === 'finished') {
    io.to(room.id).emit('game:over', {
      loser: result.state.loser,
      players: result.state.players.map((p) => ({ id: p.id, name: p.name, isOut: p.isOut })),
    });
    return;
  }

  // Chain bot turns
  setTimeout(() => processBotTurns(io, getRoom(room.id) || room), 1000);
}

function emitGameState(io: Server, room: Room): void {
  if (!room.gameState) return;

  // Send personalized state to each human player
  for (const player of room.players) {
    if (player.isBot || !player.socketId) continue;
    const personalState = stateForPlayer(room.gameState, player.id);
    io.to(player.socketId).emit('game:state', personalState);
  }
}
