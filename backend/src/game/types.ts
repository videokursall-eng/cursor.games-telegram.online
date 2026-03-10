export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type GameType = 'classic' | 'transfer';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type PlayerStatus = 'human' | 'bot';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "A♠"
}

export interface TablePair {
  attack: Card;
  defense?: Card;
}

export type TurnPhase =
  | 'attacking'   // attacker plays cards
  | 'defending'   // defender responds
  | 'transferring' // transfer durak: defender transfers
  | 'finished';   // round done

export interface Player {
  id: string;        // Telegram user id (string) or bot id
  name: string;
  photoUrl?: string;
  status: PlayerStatus;
  hand: Card[];
  isOut: boolean;    // finished game (no cards, deck empty)
}

export interface GameState {
  id: string;
  gameType: GameType;
  players: Player[];
  deck: Card[];
  trump: Card;         // trump card (bottom of deck, face-up)
  trumpSuit: Suit;
  table: TablePair[];  // attack/defense pairs on the table
  attackerIndex: number;
  defenderIndex: number;
  phase: TurnPhase;
  passCount: number;  // how many players passed in a row (classic multi-attack)
  winner?: string;    // player id of winner (last with cards = loser, so everyone else wins)
  loser?: string;     // "durak" - last player with cards
  discardPile: Card[];
  turnNumber: number;
  canTransfer: boolean; // current defender can transfer
}

export interface RoomPlayer {
  id: string;
  name: string;
  photoUrl?: string;
  isBot: boolean;
  isReady: boolean;
  socketId?: string;
}

export interface Room {
  id: string;
  gameType: GameType;
  maxPlayers: number;
  botCount: number;
  players: RoomPlayer[];
  status: RoomStatus;
  gameState?: GameState;
  createdBy: string;
  createdAt: number;
}
