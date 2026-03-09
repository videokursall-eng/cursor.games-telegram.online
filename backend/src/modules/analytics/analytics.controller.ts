import express from "express";
import { logEvent } from "../../shared/analytics";

export const analyticsRouter = express.Router();

analyticsRouter.post("/event", async (req, res) => {
  const auth = req.auth ?? null;
  const { type, payload } = req.body as { type?: string; payload?: unknown };
  if (!type) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "type is required" } });
  }
  await logEvent(auth ? auth.userId : null, type, payload);
  res.json({ ok: true });
});

