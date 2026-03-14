/**
 * Shared types and constants for Durak Mini App
 */

export const GAME_MODES = ['podkidnoy', 'perevodnoy'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export function isGameMode(value: string): value is GameMode {
  return (GAME_MODES as readonly string[]).includes(value);
}

export function isPlayerCountInRange(count: number): boolean {
  return count >= MIN_PLAYERS && count <= MAX_PLAYERS;
}

export interface RoomPublic {
  id: string;
  mode: GameMode;
  playerCount: number;
  maxPlayers: number;
  isStarted: boolean;
  inviteCode?: string;
}

export type {
  TelegramWebAppUser,
  TelegramInitDataParsed,
  InitDataRaw,
  AuthSessionPayload,
} from './telegram';

export type {
  GameModeStats,
  PlayerProfileDto,
  MatchStatsSnapshotDto,
  PlayerAggregatedStatsDto,
  AchievementDto,
  PlayerProfileWithStatsDto,
} from './stats';
export { emptyAggregatedStats } from './stats';

export type { AchievementMeta, AchievementCode } from './achievements';
export { ACHIEVEMENTS_REGISTRY, resolveAchievementMeta } from './achievements';

export type {
  CurrencyCode,
  WalletDto,
  CurrencyTransactionDto,
  CosmeticSlot,
  CosmeticRarity,
  CosmeticItemDto,
  PlayerOwnedItemDto,
  PlayerInventoryDto,
  SeasonProgressDto,
  SeasonRewardType,
  BadgeDto,
  SeasonRewardTrackItemDto,
  SeasonWithTrackDto,
  StoreOfferDto,
  PurchaseStatus,
  PurchaseOrderDto,
} from './economy';
export { emptyWallet } from './economy';
