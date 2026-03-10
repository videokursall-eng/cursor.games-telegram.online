import { Router, Request, Response } from 'express';
import { config } from '../config';
import {
  createRoom,
  getAllRooms,
  getRoom,
  deleteRoom,
} from '../store/rooms';
import { validateInitData } from '../middleware/auth';
import { RoomPlayer } from '../game/types';

const router = Router();

// Simple auth helper for REST routes
function getUser(req: Request): { id: number; first_name: string; last_name?: string; username?: string } | null {
  const initData = req.headers['x-init-data'] as string;
  if (!initData) {
    if (config.isDev) return { id: 12345, first_name: 'Test', last_name: 'User', username: 'testuser' };
    return null;
  }
  try {
    return validateInitData(initData, config.botToken).user;
  } catch {
    return null;
  }
}

router.get('/', (_req: Request, res: Response) => {
  const rooms = getAllRooms()
    .filter((r) => r.status === 'waiting')
    .map((r) => ({
      id: r.id,
      gameType: r.gameType,
      maxPlayers: r.maxPlayers,
      botCount: r.botCount,
      playerCount: r.players.length,
      status: r.status,
    }));
  res.json({ rooms });
});

router.get('/:id', (req: Request, res: Response) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const inviteLink = `https://t.me/${config.botUsername}/${config.appName}?startapp=${room.id}`;
  return res.json({ room: { ...room, inviteLink } });
});

router.post('/', (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { gameType = 'classic', maxPlayers = 4, botCount = 0 } = req.body as {
    gameType?: 'classic' | 'transfer';
    maxPlayers?: number;
    botCount?: number;
  };

  const creator: RoomPlayer = {
    id: String(user.id),
    name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
    isBot: false,
    isReady: true,
  };

  const room = createRoom({
    gameType,
    maxPlayers: Math.min(Math.max(maxPlayers, 2), 6),
    botCount: Math.min(Math.max(botCount, 0), maxPlayers - 1),
    creator,
  });

  const inviteLink = `https://t.me/${config.botUsername}/${config.appName}?startapp=${room.id}`;
  return res.status(201).json({ room: { ...room, inviteLink } });
});

router.delete('/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.createdBy !== String(user.id)) return res.status(403).json({ error: 'Forbidden' });

  deleteRoom(req.params.id);
  return res.json({ ok: true });
});

export default router;
