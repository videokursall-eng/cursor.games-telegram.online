import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { pgPool } from "../../infrastructure/db";
import { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, RoomStateResponse } from "../contracts/api.contracts";
import { z } from "zod";
import { logger } from "../../shared/logger";

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
      INSERT INTO rooms (id, owner_user_id, variant, max_players, is_private, bet_amount, currency, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'waiting')
      RETURNING id
    `,
      [
        auth.userId,
        data.variant,
        data.maxPlayers,
        data.isPrivate ?? false,
        data.betAmount ?? null,
        data.currency ?? null,
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
  const client = await pgPool.connect();
  try {
    const roomRes = await client.query(
      "SELECT id, max_players, is_private, status FROM rooms WHERE id = $1",
      [data.roomId],
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

    if (room.is_private) {
      if (!data.inviteToken) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite token required" } });
      }
      const inviteRes = await client.query(
        `
        SELECT id, status, expires_at
        FROM invites
        WHERE room_id = $1 AND token = $2
      `,
        [room.id, data.inviteToken],
      );
      if (inviteRes.rowCount === 0) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite token invalid" } });
      }
      const invite = inviteRes.rows[0] as { status: string; expires_at: Date };
      if (invite.status !== "pending" || invite.expires_at < new Date()) {
        return res.status(403).json({ error: { code: "INVITE_INVALID", message: "Invite token expired" } });
      }
    }

    const membersRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM room_members WHERE room_id = $1 AND status IN ('waiting','ready')",
      [room.id],
    );
    const count = membersRes.rows[0].count as number;
    if (count >= room.max_players) {
      return res.status(409).json({ error: { code: "ROOM_FULL", message: "Room is full" } });
    }

    await client.query(
      `
      INSERT INTO room_members (room_id, user_id, seat_index, role, status, is_host)
      VALUES (
        $1,
        $2,
        COALESCE(
          (SELECT MAX(seat_index) + 1 FROM room_members WHERE room_id = $1),
          1
        ),
        'player',
        'waiting',
        false
      )
      ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'waiting'
    `,
      [room.id, auth.userId],
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
      "SELECT id, owner_user_id, variant, max_players, is_private, status FROM rooms WHERE id = $1",
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
    };

    const membersRes = await client.query(
      `
      SELECT user_id, seat_index, role, status
      FROM room_members
      WHERE room_id = $1
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

    const response: z.infer<typeof RoomStateResponse> = {
      roomId: room.id,
      status: room.status as any,
      variant: room.variant as any,
      maxPlayers: room.max_players,
      members: membersRes.rows.map((row) => ({
        userId: row.user_id,
        seatIndex: row.seat_index,
        role: row.role,
        status: row.status,
      })),
      activeMatchId: null,
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

