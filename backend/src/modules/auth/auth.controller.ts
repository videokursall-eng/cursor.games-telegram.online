import express from "express";
import { validateTelegramAndIssueJwt } from "./auth.service";

export const authRouter = express.Router();

authRouter.post("/telegram/validate", async (req, res, next) => {
  try {
    const { initData } = req.body as { initData?: string };
    if (!initData) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "initData is required" } });
    }

    const result = await validateTelegramAndIssueJwt(initData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

