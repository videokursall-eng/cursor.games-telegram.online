import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { pgPool } from "../../infrastructure/db";
import { CosmeticsListResponse } from "../contracts/api.contracts";
import { z } from "zod";

export const cosmeticsRouter = express.Router();

cosmeticsRouter.use(requireAuth);

cosmeticsRouter.get("/list", async (req, res) => {
  const auth = req.auth!;
  const client = await pgPool.connect();
  try {
    const itemsRes = await client.query(
      `
      SELECT id, code, type, name, description, rarity, price, currency, is_limited
      FROM cosmetic_items
    `,
    );

    const ownedRes = await client.query(
      `
      SELECT DISTINCT item_id
      FROM purchases
      WHERE user_id = $1 AND status = 'paid' AND item_id IS NOT NULL
    `,
      [auth.userId],
    );

    const response: z.infer<typeof CosmeticsListResponse> = {
      items: itemsRes.rows.map((row: any) => ({
        id: row.id,
        code: row.code,
        type: row.type,
        name: row.name,
        description: row.description,
        rarity: row.rarity,
        price: row.price ? Number(row.price) : null,
        currency: row.currency,
        isLimited: row.is_limited,
      })),
      ownedItemIds: ownedRes.rows.map((r: any) => r.item_id),
    };

    res.json(response);
  } finally {
    client.release();
  }
});

