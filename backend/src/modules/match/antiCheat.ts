import type { ClientCommand } from "../../infrastructure/realtime/websocketServer.types";
import { logger } from "../../shared/logger";

export function basicAntiCheatCheck(
  userId: number,
  cmd: ClientCommand,
): { ok: true } | { ok: false; reason: string } {
  if (!cmd.matchId || !cmd.type) {
    logger.warn("Anti-cheat: invalid command shape", { userId, cmd });
    return { ok: false, reason: "INVALID_COMMAND_SHAPE" };
  }

  if (typeof cmd.id !== "string" || cmd.id.length < 8) {
    logger.warn("Anti-cheat: suspicious command id", { userId, cmdId: cmd.id });
    return { ok: false, reason: "SUSPICIOUS_ID" };
  }

  return { ok: true };
}

