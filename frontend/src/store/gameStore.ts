import { create } from 'zustand';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface TablePair {
  attack: Card;
  defense?: Card;
}

export interface GamePlayer {
  id: string;
  name: string;
  photoUrl?: string;
  status: 'human' | 'bot';
  hand: Card[];
  isOut: boolean;
}

export type GamePhase = 'attacking' | 'defending' | 'transferring' | 'finished';

export interface GameState {
  id: string;
  gameType: 'classic' | 'transfer';
  players: GamePlayer[];
  deck: Card[];
  trump: Card;
  trumpSuit: Suit;
  table: TablePair[];
  attackerIndex: number;
  defenderIndex: number;
  phase: GamePhase;
  passCount: number;
  loser?: string;
  discardPile: Card[];
  turnNumber: number;
  canTransfer: boolean;
}

export interface GameResult {
  loser?: string;
  players: Array<{ id: string; name: string; isOut: boolean }>;
}

interface GameStore {
  gameState: GameState | null;
  gameResult: GameResult | null;
  selectedCard: Card | null;
  setGameState: (state: GameState) => void;
  setGameResult: (result: GameResult) => void;
  setSelectedCard: (card: Card | null) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  gameResult: null,
  selectedCard: null,
  setGameState: (gameState) => set({ gameState }),
  setGameResult: (gameResult) => set({ gameResult }),
  setSelectedCard: (selectedCard) => set({ selectedCard }),
  clearGame: () => set({ gameState: null, gameResult: null, selectedCard: null }),
}));
