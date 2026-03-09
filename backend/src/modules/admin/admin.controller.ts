import express from "express";
import { requireAuth } from "../../infrastructure/http/middlewares/requireAuth";

export const adminRouter = express.Router();

adminRouter.use(requireAuth);

adminRouter.get("/rooms", async (_req, res) => {
  res.json({ rooms: [] });
});

