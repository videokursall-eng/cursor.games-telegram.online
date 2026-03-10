/**
 * Run SQL migrations from infrastructure/db/migrations in order.
 * Uses schema_migrations to track applied migrations; only runs new ones.
 * Usage: node dist/infrastructure/db/migrate.js [--bootstrap]
 *   --bootstrap  Mark all current .sql files as applied without running them (once per already-initialized DB).
 * Ensure POSTGRES_URL is set. Run after npm run build (migrations are copied to dist).
 */
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import dotenv from "dotenv";

const bootstrap = process.argv.includes("--bootstrap");
const backendRoot = path.resolve(path.join(__dirname, "..", "..", ".."));
dotenv.config({ path: path.join(backendRoot, ".env") });

const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  console.error("POSTGRES_URL is not set");
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "migrations");
if (!fs.existsSync(migrationsDir)) {
  console.error("Migrations directory not found:", migrationsDir);
  console.error("Run from backend root and ensure npm run build has been run (migrations are copied to dist).");
  process.exit(1);
}

const pool = new Pool({ connectionString: postgresUrl });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    let applied = new Set<string>();
    const schemaRows = await client.query("SELECT filename FROM schema_migrations");
    applied = new Set(schemaRows.rows.map((r: { filename: string }) => r.filename));

    const hasOldTable = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_migrations'
      LIMIT 1
    `);
    if (hasOldTable.rowCount !== 0 && applied.size === 0) {
      const oldRows = await client.query("SELECT name FROM _migrations");
      for (const r of oldRows.rows as { name: string }[]) {
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
          [r.name],
        );
      }
      applied = new Set(
        (await client.query("SELECT filename FROM schema_migrations")).rows.map((row: { filename: string }) => row.filename),
      );
      if (applied.size > 0) {
        console.log("Migrated", applied.size, "record(s) from _migrations to schema_migrations.");
      }
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    let appliedCount = 0;

    if (bootstrap) {
      for (const filename of files) {
        if (applied.has(filename)) continue;
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING", [filename]);
        appliedCount += 1;
      }
      console.log("Bootstrap done. Marked", appliedCount, "migration(s) as applied.");
      return;
    }

    for (const filename of files) {
      if (applied.has(filename)) {
        console.log("Skip (already applied):", filename);
        continue;
      }
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, "utf8");
      console.log("Applying:", filename);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      appliedCount += 1;
    }
    if (appliedCount === 0 && files.length > 0) {
      console.log("Migrations done. Nothing new to apply.");
    } else if (appliedCount > 0) {
      console.log("Migrations done. Applied", appliedCount, "new migration(s).");
    } else {
      console.log("Migrations done.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
