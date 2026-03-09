import { z } from "zod";

export const ErrorCode = z.enum([
  "INVALID_INIT_DATA",
  "INIT_DATA_EXPIRED",
  "TELEGRAM_CONFIG_MISSING",
  "UNAUTHORIZED",
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_NOT_IN_WAITING_STATE",
  "MATCH_NOT_FOUND",
  "MATCH_ALREADY_STARTED",
  "INVITE_INVALID",
  "INSUFFICIENT_BALANCE",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
  }),
});

export const BootstrapResponse = z.object({
  user: z.object({
    id: z.number(),
    username: z.string().nullable().optional(),
  }),
  profile: z.object({
    rating: z.number(),
    gamesPlayed: z.number(),
    gamesWon: z.number(),
  }),
  activeMatchId: z.string().uuid().nullable().optional(),
  rooms: z.array(
    z.object({
      id: z.string().uuid(),
      variant: z.enum(["classic", "transferable"]),
      maxPlayers: z.number(),
      status: z.enum(["waiting", "in_progress", "finished", "cancelled"]),
    }),
  ),
});

export const MyProfileResponse = z.object({
  user: z.object({
    id: z.number(),
    username: z.string().nullable().optional(),
  }),
  profile: z.object({
    rating: z.number(),
    gamesPlayed: z.number(),
    gamesWon: z.number(),
    gamesLost: z.number(),
    longestStreak: z.number(),
  }),
});

export const CreateRoomRequest = z.object({
  variant: z.enum(["classic", "transferable"]),
  maxPlayers: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  isPrivate: z.boolean().optional().default(false),
  betAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
});

export const CreateRoomResponse = z.object({
  roomId: z.string().uuid(),
});

export const JoinRoomRequest = z.object({
  roomId: z.string().uuid(),
  inviteToken: z.string().optional(),
});

export const JoinRoomResponse = z.object({
  roomId: z.string().uuid(),
});

export const LeaveRoomRequest = z.object({
  roomId: z.string().uuid(),
});

export const LeaveRoomResponse = z.object({
  roomId: z.string().uuid(),
});

export const AddBotsRequest = z.object({
  roomId: z.string().uuid(),
  count: z.number().int().min(1).max(3),
});

export const AddBotsResponse = z.object({
  roomId: z.string().uuid(),
});

export const StartMatchRequest = z.object({
  roomId: z.string().uuid(),
});

export const StartMatchResponse = z.object({
  matchId: z.string().uuid(),
});

export const RoomStateResponse = z.object({
  roomId: z.string().uuid(),
  status: z.enum(["waiting", "in_progress", "finished", "cancelled"]),
  variant: z.enum(["classic", "transferable"]),
  maxPlayers: z.number(),
  members: z.array(
    z.object({
      userId: z.number().nullable(),
      seatIndex: z.number(),
      role: z.enum(["owner", "player", "bot", "viewer"]),
      status: z.enum(["waiting", "ready", "left", "kicked"]),
    }),
  ),
  activeMatchId: z.string().uuid().nullable(),
  isPrivate: z.boolean(),
  inviteToken: z.string().nullable().optional(),
});

export const MatchSnapshotResponse = z.object({
  matchId: z.string().uuid(),
  variant: z.enum(["classic", "transferable"]),
  status: z.enum(["in_progress", "finished", "aborted"]),
  stateVersion: z.number(),
  trumpSuit: z.enum(["S", "H", "D", "C"]),
  players: z.array(
    z.object({
      userId: z.number(),
      seatIndex: z.number(),
      isBot: z.boolean(),
      status: z.enum(["active", "finished", "disconnected"]),
      cardsInHand: z.number(),
      cardsTaken: z.number(),
      isWinner: z.boolean(),
    }),
  ),
  turn: z.object({
    turnNumber: z.number(),
    attackerId: z.number(),
    defenderId: z.number(),
    phase: z.enum(["attack", "defence", "cleanup"]),
    tableCards: z.unknown(),
    expiresAt: z.string().datetime().nullable(),
  }),
  deck: z.object({
    remainingCount: z.number(),
    discardCount: z.number(),
    trumpCard: z.string(),
  }),
});

export const MatchHistoryResponse = z.object({
  matchId: z.string().uuid(),
  actions: z.array(
    z.object({
      seq: z.number(),
      userId: z.number(),
      type: z.enum(["PLAY_CARD", "DEFEND_CARD", "TAKE_CARDS", "PASS", "TRANSFER", "SURRENDER"]),
      createdAt: z.string().datetime(),
      payload: z.unknown(),
    }),
  ),
});

export const StatsResponse = z.object({
  userId: z.number(),
  aggregates: z.array(
    z.object({
      period: z.enum(["daily", "weekly", "monthly", "lifetime"]),
      bucketDate: z.string(),
      matchesPlayed: z.number(),
      matchesWon: z.number(),
      avgTurnTimeMs: z.number(),
      maxStreak: z.number(),
    }),
  ),
});

export const CosmeticsListResponse = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      code: z.string(),
      type: z.enum(["card_back", "table_theme", "avatar_frame"]),
      name: z.string(),
      description: z.string().nullable(),
      rarity: z.enum(["common", "rare", "epic", "legendary"]),
      price: z.number().nullable(),
      currency: z.string().nullable(),
      isLimited: z.boolean(),
    }),
  ),
  ownedItemIds: z.array(z.number()),
});

export const PurchaseCreateRequest = z.object({
  itemId: z.number(),
  currency: z.string().max(8),
});

export const PurchaseCreateResponse = z.object({
  purchaseId: z.number(),
  status: z.enum(["pending", "paid", "failed", "refunded"]),
});

export const AdminModerationBanUserRequest = z.object({
  userId: z.number(),
  reason: z.string().min(3),
});

export const AdminModerationCloseRoomRequest = z.object({
  roomId: z.string().uuid(),
});

