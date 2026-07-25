import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { withDatabaseRetry } from "../backend/lib/repository.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDirectory, "..");
const migrationsDirectory = path.join(projectRoot, "backend", "database", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("DATABASE_URL not set; skipping Postgres migrations.");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const source = await readFile(path.join(migrationsDirectory, file), "utf8");
      console.log(`Applying migration ${file}`);
      await withDatabaseRetry(() => pool.query(source), {
        attempts: 6,
        baseDelayMs: 300,
        maxDelayMs: 5_000,
        onRetry: ({ attempt, delayMs, error }) =>
          console.warn(`Migration connection retry ${attempt} in ${delayMs}ms (${error.code || error.message})`),
      });
    }
    console.log(`Applied ${files.length} Postgres migration(s)`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Unable to apply Render Postgres migrations", error);
  process.exitCode = 1;
});
