import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { logger } from "../../shared/logger";
import type { ClientCommand } from "./websocketServer.types";
import { basicAntiCheatCheck } from "../../modules/match/antiCheat";

interface AuthedSocket extends Socket {
  userId?: number;
}

export function initRealtime(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    path: "/realtime",
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
    },
  });

  const matchSequences = new Map<string, number>();
  const processedCommands = new Map<string, Set<string>>();

  function nextSeq(matchId: string): number {
    const current = matchSequences.get(matchId) ?? 0;
    const next = current + 1;
    matchSequences.set(matchId, next);
    return next;
  }

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("UNAUTHORIZED"));
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      socket.userId = Number(payload.sub);
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    if (!socket.userId) {
      socket.disconnect(true);
      return;
    }

    logger.info("Socket.IO connected", { userId: socket.userId, id: socket.id });

    socket.on("join_match", (data: { matchId: string }, ack?: (res: { ok: boolean }) => void) => {
      if (!data?.matchId) {
        ack?.({ ok: false });
        return;
      }
      socket.join(`match:${data.matchId}`);
      ack?.({ ok: true });
    });

    socket.on("leave_match", (data: { matchId: string }, ack?: (res: { ok: boolean }) => void) => {
      if (!data?.matchId) {
        ack?.({ ok: false });
        return;
      }
      socket.leave(`match:${data.matchId}`);
      ack?.({ ok: true });
    });

    socket.on("command", (cmd: ClientCommand, ack?: (res: { ok: boolean; seq?: number; error?: string }) => void) => {
      if (!cmd?.id || !cmd.matchId || !cmd.type) {
        ack?.({ ok: false, error: "INVALID_COMMAND" });
        return;
      }

      const anti = basicAntiCheatCheck(socket.userId!, cmd);
      if (!anti.ok) {
        ack?.({ ok: false, error: anti.reason });
        return;
      }

      const key = `${socket.userId}:${cmd.id}`;
      const seen = processedCommands.get(cmd.matchId) ?? new Set<string>();
      if (seen.has(key)) {
        ack?.({ ok: true, seq: matchSequences.get(cmd.matchId) });
        return;
      }

      seen.add(key);
      processedCommands.set(cmd.matchId, seen);

      const seq = nextSeq(cmd.matchId);
      io.to(`match:${cmd.matchId}`).emit("match_event", {
        matchId: cmd.matchId,
        seq,
        type: cmd.type,
        fromUserId: socket.userId,
        payload: cmd.payload,
      });

      ack?.({ ok: true, seq });
    });

    socket.on("heartbeat", (payload: { ts: number }, ack?: (res: { ok: boolean; ts: number }) => void) => {
      ack?.({ ok: true, ts: payload?.ts ?? Date.now() });
    });

    socket.on("disconnect", (reason) => {
      logger.info("Socket.IO disconnected", { userId: socket.userId, id: socket.id, reason });
    });
  });

  logger.info("Socket.IO realtime server initialized at /realtime");
}

