import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { createApiRouter } from "./infrastructure/http/routes";
import { authMiddleware } from "./infrastructure/http/middlewares/authContext";
import { rateLimit } from "./infrastructure/http/middlewares/rateLimit";
import { errorHandler } from "./infrastructure/http/middlewares/errorHandler";
import { initDb } from "./infrastructure/db";
import { initRedis } from "./infrastructure/redis";
import { logger } from "./shared/logger";
import { config } from "./config";
import { initRealtime } from "./infrastructure/realtime/websocketServer";

export async function createApp() {
  await initDb();
  await initRedis();

  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(rateLimit);
  app.use(authMiddleware);

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", createApiRouter());

  app.use(errorHandler);

  const httpServer = createServer(app);
  initRealtime(httpServer);

  logger.info(`App initialized in ${config.env} mode`);

  return { app, httpServer };
}

