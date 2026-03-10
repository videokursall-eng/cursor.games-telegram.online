import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { pgPool } from "../../infrastructure/db";
import { StatsResponse } from "../contracts/api.contracts";
import { z } from "zod";

export const statsRouter = express.Router();

statsRouter.use(requireAuth);

statsRouter.get("/me/profile", async (req, res) => {
  const auth = req.auth!;
  const client = await pgPool.connect();
  try {
    const userRes = await client.query("SELECT id, username FROM users WHERE id = $1 LIMIT 1", [auth.userId]);
    const user = userRes.rows[0] ?? { id: auth.userId, username: null };

    const profileRes = await client.query(
      "SELECT rating, games_played, games_won, games_lost, longest_streak FROM profiles WHERE user_id = $1 LIMIT 1",
      [auth.userId],
    );
    const p = profileRes.rows[0] ?? { rating: 1000, games_played: 0, games_won: 0, games_lost: 0, longest_streak: 0 };

    res.json({
      user: { id: user.id, username: user.username ?? null },
      profile: {
        rating: p.rating,
        gamesPlayed: p.games_played,
        gamesWon: p.games_won,
        gamesLost: p.games_lost,
        longestStreak: p.longest_streak,
      },
    });
  } finally {
    client.release();
  }
});

statsRouter.get("/me", async (req, res) => {
  const auth = req.auth!;
  const client = await pgPool.connect();
  try {
    const profileRes = await client.query(
      `
      SELECT rating, games_played, games_won, games_lost, longest_streak
      FROM profiles
      WHERE user_id = $1
    `,
      [auth.userId],
    );

    const profile =
      profileRes.rows[0] ??
      ({
        rating: 1000,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        longest_streak: 0,
      } as const);

    const response: z.infer<typeof StatsResponse> = {
      userId: auth.userId,
      aggregates: [
        {
          period: "lifetime",
          bucketDate: new Date().toISOString().slice(0, 10),
          matchesPlayed: profile.games_played,
          matchesWon: profile.games_won,
          avgTurnTimeMs: 0,
          maxStreak: profile.longest_streak,
        },
      ],
    };

    res.json(response);
  } finally {
    client.release();
  }
});

