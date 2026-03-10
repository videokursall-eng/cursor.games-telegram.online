import { Room, RoomPlayer } from '../game/types';

const rooms = new Map<string, Room>();

function genId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function createRoom(params: {
  gameType: Room['gameType'];
  maxPlayers: number;
  botCount: number;
  creator: RoomPlayer;
}): Room {
  let id = genId();
  while (rooms.has(id)) id = genId();

  const room: Room = {
    id,
    gameType: params.gameType,
    maxPlayers: params.maxPlayers,
    botCount: params.botCount,
    players: [params.creator],
    status: 'waiting',
    createdBy: params.creator.id,
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

export function updateRoom(room: Room): void {
  rooms.set(room.id, room);
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}

export function addPlayerToRoom(roomId: string, player: RoomPlayer): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.status !== 'waiting') return null;
  if (room.players.length >= room.maxPlayers - room.botCount) return null;
  if (room.players.find((p) => p.id === player.id)) {
    // Update socket id
    room.players = room.players.map((p) =>
      p.id === player.id ? { ...p, socketId: player.socketId } : p,
    );
    rooms.set(roomId, room);
    return room;
  }
  room.players.push(player);
  rooms.set(roomId, room);
  return room;
}

export function removePlayerFromRoom(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }
  // Assign new creator if needed
  if (room.createdBy === playerId) {
    room.createdBy = room.players[0].id;
  }
  rooms.set(roomId, room);
  return room;
}

// Clean up old empty/finished rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (room.status === 'finished' && now - room.createdAt > 3600_000) {
      rooms.delete(id);
    }
    if (room.players.length === 0) {
      rooms.delete(id);
    }
  }
}, 600_000);
