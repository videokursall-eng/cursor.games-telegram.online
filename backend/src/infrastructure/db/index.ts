import { Pool } from "pg";
import { config } from "../../config";
import { logger } from "../../shared/logger";

export const pgPool = new Pool({
  connectionString: config.postgresUrl,
});

pgPool.on("error", (err: unknown) => {
  logger.error("Unexpected PG pool error", err);
});

export async function initDb(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    logger.info("Skipping PostgreSQL initialization in test environment");
    return;
  }

  if (!config.postgresUrl) {
    logger.warn("POSTGRES_URL is not set; database will not be initialized");
    return;
  }

  const client = await pgPool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("PostgreSQL connection OK");
  } finally {
    client.release();
  }
}


