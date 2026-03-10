import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { getMatchState } from "./match.service";

export const matchRouter = express.Router();

matchRouter.use(requireAuth);

matchRouter.get("/state/:matchId", async (req, res) => {
  const auth = req.auth!;
  const { matchId } = req.params;
  const snapshot = await getMatchState(matchId, auth.userId);
  if (!snapshot) {
    return res.status(404).json({ error: { code: "MATCH_NOT_FOUND", message: "Match not found" } });
  }
  res.json(snapshot);
});

