import express from "express";

export const botRouter = express.Router();

botRouter.post("/webhook", async (_req, res) => {
  // Placeholder: handle Telegram Update
  res.json({ ok: true });
});

