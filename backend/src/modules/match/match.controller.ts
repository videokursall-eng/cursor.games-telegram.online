import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";

export const matchRouter = express.Router();

matchRouter.use(requireAuth);

matchRouter.get("/state/:matchId", async (req, res) => {
  const { matchId } = req.params;
  res.json({
    matchId,
    stateVersion: 0,
    players: [],
    hands: {},
    table: [],
    trump: null,
    phase: "WAITING",
    deckCount: 0,
    discardCount: 0,
  });
});

