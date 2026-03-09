import { config } from "./config";
import { createApp } from "./app";
import { logger } from "./shared/logger";

async function bootstrap() {
  const { httpServer } = await createApp();

  httpServer.listen(config.port, () => {
    logger.info(`Backend listening on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to bootstrap app", err);
  process.exit(1);
});


