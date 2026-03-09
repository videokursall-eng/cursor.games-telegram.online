import express from "express";
import { pgPool } from "../../infrastructure/db";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";

export const leaderboardRouter = express.Router();

leaderboardRouter.use(requireAuth);

leaderboardRouter.get("/leaderboard", async (_req, res) => {
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT u.id, u.username, p.rating
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.rating DESC
      LIMIT 50
    `,
    );

    res.json({
      entries: result.rows.map((row: any, index: number) => ({
        userId: row.id,
        username: row.username,
        rating: row.rating,
        position: index + 1,
      })),
    });
  } finally {
    client.release();
  }
});

