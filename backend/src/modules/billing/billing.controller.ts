import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";
import { pgPool } from "../../infrastructure/db";
import { PurchaseCreateRequest, PurchaseCreateResponse } from "../contracts/api.contracts";
import { z } from "zod";
import { logEvent } from "../../shared/analytics";

export const billingRouter = express.Router();

billingRouter.use(requireAuth);

billingRouter.get("/balance", async (req, res) => {
  const auth = req.auth!;
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT balance, currency
      FROM user_balances
      WHERE user_id = $1
    `,
      [auth.userId],
    );
    const row = result.rows[0] ?? { balance: 0, currency: "RUB" };
    res.json({
      balance: Number(row.balance) || 0,
      currency: row.currency || "RUB",
    });
  } finally {
    client.release();
  }
});

billingRouter.post("/purchase", async (req, res) => {
  const auth = req.auth!;
  const parse = PurchaseCreateRequest.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Invalid purchase payload" } });
  }
  const data = parse.data;

  if (data.currency !== "RUB") {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Unsupported currency" } });
  }

  const client = await pgPool.connect();
  try {
    const priceRes = await client.query(
      "SELECT price, currency FROM cosmetic_items WHERE id = $1",
      [data.itemId],
    );
    if (priceRes.rowCount === 0) {
      return res
        .status(404)
        .json({ error: { code: "VALIDATION_ERROR", message: "Item not found" } });
    }
    const item = priceRes.rows[0] as { price: number; currency: string };

    if (item.price <= 0) {
      return res
        .status(400)
        .json({ error: { code: "VALIDATION_ERROR", message: "Item not purchasable" } });
    }

    const insertRes = await client.query(
      `
      INSERT INTO purchases (user_id, amount, currency, status, item_id)
      VALUES ($1, $2, $3, 'paid', $4)
      RETURNING id, status
    `,
      [auth.userId, item.price, item.currency, data.itemId],
    );

    const purchaseId: number = insertRes.rows[0].id;
    const response: z.infer<typeof PurchaseCreateResponse> = {
      purchaseId,
      status: insertRes.rows[0].status,
    };

    res.json(response);
    void logEvent(auth.userId, "purchase", { purchaseId, itemId: data.itemId });
  } finally {
    client.release();
  }
});

