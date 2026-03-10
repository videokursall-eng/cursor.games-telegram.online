import { create } from 'zustand';

export interface RoomPlayer {
  id: string;
  name: string;
  photoUrl?: string;
  isBot: boolean;
  isReady: boolean;
}

export interface Room {
  id: string;
  gameType: 'classic' | 'transfer';
  maxPlayers: number;
  botCount: number;
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  inviteLink?: string;
}

interface RoomStore {
  room: Room | null;
  setRoom: (room: Room) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  clearRoom: () => set({ room: null }),
}));
