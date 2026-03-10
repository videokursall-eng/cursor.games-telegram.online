import express from "express";
import crypto from "crypto";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { pgPool } from "../../infrastructure/db";
import { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, RoomStateResponse, StartMatchRequest, StartMatchResponse } from "../contracts/api.contracts";
import { z } from "zod";
import { logger } from "../../shared/logger";
import { createInitialState } from "../game-engine/engine";

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}

export const roomRouter = express.Router();

roomRouter.use(requireAuth);

roomRouter.get("/overview", async (_req, res) => {
  res.json({
    rooms: [],
    userStats: {
      matchesPlayed: 0,
      matchesWon: 0,
      rating: 0,
    },
    activeMatchId: null,
  });
});

roomRouter.post("/create", async (req, res) => {
  const auth = req.auth!;
  const parse = CreateRoomRequest.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid create room payload" } });
  }
  const data = parse.data;

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      INSERT INTO rooms (id, owner_user_id, variant, max_players, is_private, bet_amount, currency, status, bot_count)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'waiting', $7)
      RETURNING id
    `,
      [
        auth.userId,
        data.variant,
        data.maxPlayers,
        data.isPrivate ?? false,
        data.betAmount ?? null,
        data.currency ?? null,
        data.botCount ?? 0,
      ],
    );

    const roomId: string = result.rows[0].id;
    await client.query(
      `
      INSERT INTO room_members (room_id, user_id, seat_index, role, status, is_host)
      VALUES ($1, $2, 0, 'owner', 'waiting', true)
    `,
      [roomId, auth.userId],
    );

    if (data.isPrivate) {
      const token = generateInviteCode();
      await client.query(
        `
        INSERT INTO invites (id, room_id, from_user_id, token, status, expires_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'pending', now() + interval '7 days')
      `,
        [roomId, auth.userId, token],
      );
    }

    const response: z.infer<typeof CreateRoomResponse> = { roomId };
    res.json(response);
  } catch (err) {
    logger.error("Failed to create room", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create room" } });
  } finally {
    client.release();
  }
});

roomRouter.post("/join", async (req, res) => {
  const auth = req.auth!;
  const parse = JoinRoomRequest.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid join room payload" } });
  }
  const data = parse.data;
  let roomId: string | null = data.roomId ?? null;

  const client = await pgPool.connect();
  try {
    if (data.inviteCode && !roomId) {
      const code = data.inviteCode.trim().toUpperCase();
      const inviteRes = await client.query(
        "SELECT room_id FROM invites WHERE token = $1 AND status = 'pending' AND expires_at > now()",
        [code],
      );
      if (inviteRes.rowCount === 0) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invalid or expired invite code" } });
      }
      roomId = inviteRes.rows[0].room_id as string;
    }

    if (!roomId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "roomId or inviteCode required" } });
    }

    const roomRes = await client.query(
      "SELECT id, max_players, is_private, status FROM rooms WHERE id = $1",
      [roomId],
    );
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: { code: "ROOM_NOT_FOUND", message: "Room not found" } });
    }
    const room = roomRes.rows[0] as {
      id: string;
      max_players: number;
      is_private: boolean;
      status: string;
    };
    if (room.status !== "waiting") {
      return res
        .status(409)
        .json({ error: { code: "ROOM_NOT_IN_WAITING_STATE", message: "Room is not accepting new players" } });
    }

    const tokenToCheck = data.inviteCode?.trim().toUpperCase() ?? data.inviteToken;
    if (room.is_private && !tokenToCheck) {
      return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite token or code required" } });
    }
    if (room.is_private && tokenToCheck) {
      const inviteRes = await client.query(
        "SELECT id, status, expires_at FROM invites WHERE room_id = $1 AND token = $2",
        [room.id, tokenToCheck],
      );
      if (inviteRes.rowCount === 0) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite invalid" } });
      }
      const invite = inviteRes.rows[0] as { status: string; expires_at: Date };
      if (invite.status !== "pending" || invite.expires_at < new Date()) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite expired" } });
      }
    }

    const membersRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM room_members WHERE room_id = $1 AND user_id IS NOT NULL AND status IN ('waiting','ready')",
      [room.id],
    );
    const count = membersRes.rows[0].count as number;
    if (count >= room.max_players) {
      return res.status(409).json({ error: { code: "ROOM_FULL", message: "Room is full" } });
    }

    const maxSeat = await client.query(
      "SELECT COALESCE(MAX(seat_index), -1)::int + 1 AS next_seat FROM room_members WHERE room_id = $1",
      [room.id],
    );
    const nextSeat = maxSeat.rows[0].next_seat as number;
    await client.query(
      `
      INSERT INTO room_members (room_id, user_id, seat_index, role, status, is_host)
      VALUES ($1, $2, $3, 'player', 'waiting', false)
      ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'waiting', seat_index = EXCLUDED.seat_index
    `,
      [room.id, auth.userId, nextSeat],
    );

    const response: z.infer<typeof JoinRoomResponse> = { roomId: room.id };
    res.json(response);
  } catch (err) {
    logger.error("Failed to join room", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to join room" } });
  } finally {
    client.release();
  }
});

roomRouter.get("/state/:roomId", async (req, res) => {
  const auth = req.auth!;
  const roomId = req.params.roomId;
  const client = await pgPool.connect();
  try {
    const roomRes = await client.query(
      "SELECT id, owner_user_id, variant, max_players, is_private, status, COALESCE(bot_count, 0) AS bot_count FROM rooms WHERE id = $1",
      [roomId],
    );
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: { code: "ROOM_NOT_FOUND", message: "Room not found" } });
    }
    const room = roomRes.rows[0] as {
      id: string;
      owner_user_id: number;
      variant: string;
      max_players: number;
      is_private: boolean;
      status: string;
      bot_count: number;
    };

    const membersRes = await client.query(
      `
      SELECT user_id, seat_index, role, status
      FROM room_members
      WHERE room_id = $1 AND user_id IS NOT NULL
      ORDER BY seat_index ASC
    `,
      [room.id],
    );

    const inviteRes = await client.query(
      `
      SELECT token
      FROM invites
      WHERE room_id = $1 AND status = 'pending' AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [room.id],
    );

    let activeMatchId: string | null = null;
    const matchRes = await client.query(
      "SELECT id FROM matches WHERE room_id = $1 AND status = 'in_progress' LIMIT 1",
      [room.id],
    );
    if (matchRes.rowCount && matchRes.rowCount > 0) {
      activeMatchId = matchRes.rows[0].id as string;
    }

    const response: z.infer<typeof RoomStateResponse> = {
      roomId: room.id,
      status: room.status as any,
      variant: room.variant as any,
      maxPlayers: room.max_players,
      botCount: room.bot_count ?? 0,
      members: membersRes.rows.map((row) => ({
        userId: row.user_id,
        seatIndex: row.seat_index,
        role: row.role,
        status: row.status,
        isBot: false,
      })),
      activeMatchId,
      isPrivate: room.is_private,
      inviteToken: room.owner_user_id === auth.userId ? inviteRes.rows[0]?.token ?? null : null,
    };

    res.json(response);
  } catch (err) {
    logger.error("Failed to load room state", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load room" } });
  } finally {
    client.release();
  }
});

roomRouter.post("/start", async (req, res) => {
  const auth = req.auth!;
  const parse = StartMatchRequest.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid start match payload" } });
  }
  const { roomId } = parse.data;
  const client = await pgPool.connect();
  try {
    const roomRes = await client.query(
      "SELECT id, owner_user_id, variant, max_players, COALESCE(bot_count, 0) AS bot_count, status FROM rooms WHERE id = $1",
      [roomId],
    );
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: { code: "ROOM_NOT_FOUND", message: "Room not found" } });
    }
    const room = roomRes.rows[0] as {
      id: string;
      owner_user_id: number;
      variant: string;
      max_players: number;
      bot_count: number;
      status: string;
    };
    if (room.owner_user_id !== auth.userId) {
      return res.status(403).json({ error: { code: "UNAUTHORIZED", message: "Only owner can start" } });
    }
    if (room.status !== "waiting") {
      return res.status(409).json({ error: { code: "ROOM_NOT_IN_WAITING_STATE", message: "Room already started" } });
    }

    const membersRes = await client.query(
      "SELECT user_id, seat_index FROM room_members WHERE room_id = $1 AND user_id IS NOT NULL AND status IN ('waiting','ready') ORDER BY seat_index",
      [room.id],
    );
    const humanCount = membersRes.rows.length;
    const botCount = room.bot_count ?? 0;
    const totalCount = humanCount + botCount;
    if (totalCount < 2 || totalCount > room.max_players) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Need 2 to max_players players (humans + bots)" } });
    }

    const matchId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 0xffffffff);
    const mode = room.variant === "transferable" ? "transferable" : "classic";

    const orderedSeats: { seatIndex: number; userId: number | null; isBot: boolean }[] = [];
    for (const row of membersRes.rows as { user_id: number; seat_index: number }[]) {
      while (orderedSeats.length < row.seat_index) {
        orderedSeats.push({ seatIndex: orderedSeats.length, userId: null, isBot: true });
      }
      orderedSeats.push({ seatIndex: row.seat_index, userId: row.user_id, isBot: false });
    }
    while (orderedSeats.filter((s) => s.isBot).length < botCount) {
      orderedSeats.push({ seatIndex: orderedSeats.length, userId: null, isBot: true });
    }
    orderedSeats.sort((a, b) => a.seatIndex - b.seatIndex);
    const playerIds = orderedSeats.map((s) => (s.userId !== null ? s.userId : -(s.seatIndex + 1000)));
    const initialState = createInitialState(playerIds, seed, mode);

    const trumpSuit = initialState.trumpSuit;
    const lastState = JSON.stringify(initialState);

    await client.query(
      "INSERT INTO matches (id, room_id, variant, status, trump_suit, state_version, last_state, started_at) VALUES ($1, $2, $3, 'in_progress', $4, 1, $5::jsonb, now())",
      [matchId, room.id, room.variant, trumpSuit, lastState],
    );

    for (let i = 0; i < orderedSeats.length; i++) {
      const s = orderedSeats[i]!;
      const handSize = initialState.players[i]?.hand.length ?? 0;
      await client.query(
        "INSERT INTO match_players (match_id, user_id, seat_index, is_bot, status, cards_in_hand, cards_taken, is_winner) VALUES ($1, $2, $3, $4, 'active', $5, 0, false)",
        [matchId, s.userId, s.seatIndex, s.isBot, handSize],
      );
    }

    await client.query("UPDATE rooms SET status = 'in_progress', updated_at = now() WHERE id = $1", [room.id]);

    const response: z.infer<typeof StartMatchResponse> = { matchId };
    res.json(response);
  } catch (err) {
    logger.error("Failed to start match", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to start match" } });
  } finally {
    client.release();
  }
});
