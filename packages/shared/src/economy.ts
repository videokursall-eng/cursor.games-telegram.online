/**
 * Shared DTOs and contracts for in-game economy and cosmetics.
 *
 * IMPORTANT RULE:
 *   Economy and cosmetics MUST NOT affect player strength or match logic.
 *   These types intentionally avoid any fields that modify gameplay power.
 */

/** Supported in-game currency codes. */
export type CurrencyCode = 'soft' | 'stars';

/** Wallet with soft currency (and optionally other currencies in future). */
export interface WalletDto {
  userId: string;
  currency: CurrencyCode;
  balance: number;
  updatedAt: string;
}

/** Single currency transaction (history). */
export interface CurrencyTransactionDto {
  id: string;
  userId: string;
  currency: CurrencyCode;
  /** Positive for credit, negative for debit. */
  amount: number;
  /** High-level reason, for analytics and debugging. */
  reason:
    | 'match_reward'
    | 'daily_reward'
    | 'season_pass'
    | 'store_purchase'
    | 'admin_adjustment'
    | 'refund'
    | 'other';
  /** Optional free-form metadata (e.g. offerId, seasonId). */
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Cosmetic item slot: purely visual and never impacts gameplay. */
export type CosmeticSlot = 'avatar' | 'avatar_frame' | 'card_back' | 'table_theme' | 'badge' | 'emote';

/** Rarity buckets for cosmetics. */
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Cosmetic item definition (catalog entry). */
export interface CosmeticItemDto {
  id: string;
  /** Stable key used in configs and code. */
  key: string;
  name: string;
  description?: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  /** Optional icon URL or sprite key. */
  iconUrl?: string | null;
  /** Soft currency price (optional, if purchasable for soft). */
  priceSoft?: number | null;
  /** Telegram Stars price (optional, if purchasable for Stars). */
  priceStars?: number | null;
  /** If true, item is not directly purchasable (e.g. only via achievements/season). */
  isExclusive?: boolean;
  /** If true, item is limited-time or season-bound. */
  isLimited?: boolean;
  seasonId?: string | null;
}

/** Single owned cosmetic item in player's inventory. */
export interface PlayerOwnedItemDto {
  itemId: string;
  /** When the player obtained this item. */
  acquiredAt: string;
  /** Source: purchase, reward, season, etc. */
  source: 'purchase' | 'season_reward' | 'achievement' | 'grant' | 'other';
  /** Optional tag for associated season/offer. */
  tag?: string;
}

/** Player cosmetic inventory and equipped items. */
export interface PlayerInventoryDto {
  userId: string;
  /** Flat list of owned cosmetic items (by itemId). */
  ownedItems: PlayerOwnedItemDto[];
  /** Mapping of equipped item per cosmetic slot. */
  equippedItems: Partial<Record<CosmeticSlot, string /* itemId */>>;
}

/** Per-season battle-pass like progress (purely cosmetic/reward based). */
export interface SeasonProgressDto {
  userId: string;
  seasonId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  /** Reward identifiers already claimed for this season. */
  claimedRewardIds: string[];
  updatedAt: string;
}

export type SeasonRewardType = 'soft' | 'cosmetic' | 'badge';

export interface BadgeDto {
  code: string;
  title: string;
  description?: string;
  icon?: string | null;
  rarity?: string | null;
}

export interface SeasonRewardTrackItemDto {
  level: number;
  rewardType: SeasonRewardType;
  softAmount?: number;
  cosmeticCode?: string;
  badgeCode?: string;
  badge?: BadgeDto;
  claimed: boolean;
  claimable: boolean;
}

export interface SeasonWithTrackDto {
  progress: SeasonProgressDto;
  rewardTrack: SeasonRewardTrackItemDto[];
}

/** Store offer product, for soft or Telegram Stars. */
export interface StoreOfferDto {
  id: string;
  /** Stable key to map to backend config. */
  key: string;
  title: string;
  description?: string;
  /** If true, should be highlighted in UI. */
  featured?: boolean;
  /** Soft currency price (optional). */
  priceSoft?: number | null;
  /** Telegram Stars price (optional). */
  priceStars?: number | null;
  /** Optional real-world price hint (e.g. from Telegram). */
  priceFiat?: {
    amountMinor: number;
    currencyCode: string;
  } | null;
  /** List of cosmetic items or currency granted by this offer. */
  grants: Array<
    | { type: 'currency'; currency: CurrencyCode; amount: number }
    | { type: 'cosmetic'; itemId: string }
  >;
  /** Optional soft requirements (e.g., minimum level). */
  requirements?: {
    minSeasonLevel?: number;
  };
  /** Optional tags for segmentation (e.g., "starter", "season", "limited"). */
  tags?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
}

export type PurchaseStatus = 'pending' | 'authorized' | 'completed' | 'failed' | 'cancelled';

/**
 * Purchase order / payment intent for a store offer.
 *
 * For Telegram Stars, this should map to a single Stars payment; it never changes in-match power.
 */
export interface PurchaseOrderDto {
  id: string;
  userId: string;
  offerId: string;
  status: PurchaseStatus;
  /** Currency used for this purchase (soft or Stars). */
  currency: CurrencyCode;
  /** Expected amount to charge (e.g. Stars count or soft amount). */
  amount: number;
  /** Optional raw payload from Telegram Stars / payments API. */
  providerPayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Utility factory for an empty wallet. */
export function emptyWallet(userId: string, currency: CurrencyCode = 'soft'): WalletDto {
  return {
    userId,
    currency,
    balance: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

