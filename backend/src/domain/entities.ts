export type DurakVariant = "classic" | "transferable";

export interface User {
  id: number;
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Profile {
  id: number;
  userId: number;
  avatarUrl?: string | null;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RoomStatus = "waiting" | "in_progress" | "finished" | "cancelled";

export interface Room {
  id: string;
  ownerUserId: number;
  variant: DurakVariant;
  maxPlayers: number;
  isPrivate: boolean;
  betAmount?: number | null;
  currency?: string | null;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type RoomMemberRole = "owner" | "player" | "bot" | "viewer";
export type RoomMemberStatus = "waiting" | "ready" | "left" | "kicked";

export interface RoomMember {
  id: number;
  roomId: string;
  userId?: number | null;
  seatIndex: number;
  role: RoomMemberRole;
  status: RoomMemberStatus;
  isHost: boolean;
  joinedAt: Date;
  leftAt?: Date | null;
}

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invite {
  id: string;
  roomId: string;
  fromUserId: number;
  toUserId?: number | null;
  token: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
}

export type MatchStatus = "in_progress" | "finished" | "aborted";

export interface Match {
  id: string;
  roomId: string;
  variant: DurakVariant;
  status: MatchStatus;
  trumpSuit: "S" | "H" | "D" | "C";
  stateVersion: number;
  lastState: unknown;
  startedAt: Date;
  finishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MatchPlayerStatus = "active" | "finished" | "disconnected";

export interface MatchPlayer {
  id: number;
  matchId: string;
  userId: number;
  seatIndex: number;
  isBot: boolean;
  status: MatchPlayerStatus;
  cardsInHand: number;
  cardsTaken: number;
  isWinner: boolean;
}

export interface DeckSnapshot {
  id: number;
  matchId: string;
  version: number;
  remainingCount: number;
  discardCount: number;
  trumpCard: string;
  payload: unknown;
  createdAt: Date;
}

export type TurnPhase = "attack" | "defence" | "cleanup";

export interface TurnState {
  id: number;
  matchId: string;
  turnNumber: number;
  attackerId: number;
  defenderId: number;
  phase: TurnPhase;
  tableCards: unknown;
  expiresAt?: Date | null;
  createdAt: Date;
}

export type ActionType =
  | "PLAY_CARD"
  | "DEFEND_CARD"
  | "TAKE_CARDS"
  | "PASS"
  | "TRANSFER"
  | "SURRENDER";

export interface ActionLog {
  id: number;
  matchId: string;
  seq: number;
  userId: number;
  type: ActionType;
  clientActionId?: string | null;
  payload: unknown;
  createdAt: Date;
}

export type ReconnectTokenStatus = "active" | "used" | "expired";

export interface ReconnectToken {
  id: string;
  matchId: string;
  userId: number;
  token: string;
  status: ReconnectTokenStatus;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date | null;
}

export interface StatAggregate {
  id: number;
  userId: number;
  period: "daily" | "weekly" | "monthly" | "lifetime";
  bucketDate: Date;
  matchesPlayed: number;
  matchesWon: number;
  avgTurnTimeMs: number;
  maxStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded";

export interface Purchase {
  id: number;
  userId: number;
  externalId?: string | null;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  itemId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";
export type CosmeticType = "card_back" | "table_theme" | "avatar_frame";

export interface CosmeticItem {
  id: number;
  code: string;
  type: CosmeticType;
  name: string;
  description?: string | null;
  rarity: CosmeticRarity;
  price?: number | null;
  currency?: string | null;
  isLimited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

