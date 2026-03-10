/**
 * Run SQL migrations from infrastructure/db/migrations in order.
 * Usage: node dist/infrastructure/db/migrate.js
 * Ensure POSTGRES_URL is set and run after npm run build (migrations are copied to dist).
 */
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import dotenv from "dotenv";

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
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query("SELECT name FROM _migrations")).rows.map((r: { name: string }) => r.name),
    );

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const name of files) {
      if (applied.has(name)) {
        console.log("Skip (already applied):", name);
        continue;
      }
      const filePath = path.join(migrationsDir, name);
      const sql = fs.readFileSync(filePath, "utf8");
      console.log("Applying:", name);
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
    }
    console.log("Migrations done.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
