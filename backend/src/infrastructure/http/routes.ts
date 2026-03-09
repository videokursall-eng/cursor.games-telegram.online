import express from "express";
import { authRouter } from "../../modules/auth/auth.controller";
import { roomRouter } from "../../modules/room/room.controller";
import { matchRouter } from "../../modules/match/match.controller";
import { statsRouter } from "../../modules/stats/stats.controller";
import { leaderboardRouter } from "../../modules/stats/leaderboard.controller";
import { billingRouter } from "../../modules/billing/billing.controller";
import { adminRouter } from "../../modules/admin/admin.controller";
import { botRouter } from "../../modules/bot/bot.controller";
import { analyticsRouter } from "../../modules/analytics/analytics.controller";
import { cosmeticsRouter } from "../../modules/cosmetics/cosmetics.controller";

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.use("/auth", authRouter);
  router.use("/room", roomRouter);
  router.use("/match", matchRouter);
  router.use("/stats", statsRouter);
  router.use("/stats", leaderboardRouter);
  router.use("/billing", billingRouter);
  router.use("/admin", adminRouter);
  router.use("/bot", botRouter);
  router.use("/analytics", analyticsRouter);
  router.use("/cosmetics", cosmeticsRouter);

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}

