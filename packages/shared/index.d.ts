export type CurrencyCode = 'soft' | 'stars';
export type GameMode = 'podkidnoy' | 'perevodnoy';
export type GameModeStats = GameMode;
export type CosmeticSlot = 'avatar' | 'frame' | 'badge' | 'table' | 'card_back';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface AuthSessionPayload {
  sub: string;
  userId: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isAdmin: boolean;
}

export interface WalletDto {
  userId: string;
  currency: CurrencyCode;
  balance: number;
  updatedAt: string;
}

export type TransactionReason =
  | 'match_reward'
  | 'purchase'
  | 'admin_grant'
  | 'refund'
  | 'season_reward'
  | 'stars_purchase'
  | 'other';

export interface CurrencyTransactionDto {
  id: string;
  userId: string;
  currency: CurrencyCode;
  amount: number;
  reason: TransactionReason;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PlayerProfileDto {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  isAdmin: boolean;
}

export interface ModeStatsBucket {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface PlayerAggregatedStatsDto {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  averageMatchDurationMs: number;
  totalMatchDurationMs: number;
  favoriteMode: GameModeStats | null;
  perModeTotals: Record<GameModeStats, ModeStatsBucket>;
}

export interface AchievementDto {
  code: string;
  name?: string;
  description?: string;
  icon?: string;
  unlockedAt: string | null;
  currentValue?: number;
  targetValue?: number;
}

export interface CosmeticItemDto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  rarity: CosmeticRarity;
  slot: CosmeticSlot;
  priceSoft?: number | null;
  priceStars?: number | null;
  active?: boolean;
}

export interface PlayerOwnedItemDto {
  itemId: string;
  acquiredAt: string;
  source?: string;
}

export interface PlayerInventoryDto {
  userId: string;
  items: PlayerOwnedItemDto[];
  equipped: Partial<Record<CosmeticSlot, string | null>>;
  updatedAt?: string;
}

export interface StoreOfferDto {
  id: string;
  itemId: string;
  item?: CosmeticItemDto;
  currency: CurrencyCode;
  price: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BadgeDto {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  active?: boolean;
}

export interface SeasonRewardTrackItemDto {
  level: number;
  softReward?: number;
  starsReward?: number;
  cosmeticItemId?: string | null;
  cosmeticItem?: CosmeticItemDto | null;
  badgeId?: string | null;
  badge?: BadgeDto | null;
}

export interface SeasonProgressDto {
  seasonId: string;
  userId: string;
  xp: number;
  level: number;
  updatedAt?: string;
}

export interface SeasonWithTrackDto {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  startedAt?: string;
  endsAt?: string;
  rewards: SeasonRewardTrackItemDto[];
  progress?: SeasonProgressDto | null;
}

export interface PlayerProfileWithStatsDto {
  profile: PlayerProfileDto;
  stats: PlayerAggregatedStatsDto;
  achievements: AchievementDto[];
  season: SeasonProgressDto | null;
}

export declare const ACHIEVEMENTS_REGISTRY: {
  code: string;
  name: string;
  description: string;
  icon: string;
}[];

export declare function emptyWallet(userId: string, currency?: CurrencyCode): WalletDto;
export declare function emptyAggregatedStats(): PlayerAggregatedStatsDto;
export declare function resolveAchievementMeta(code: string): {
  code: string;
  name: string;
  description: string;
  icon: string;
} | null;
