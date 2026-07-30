// One-off: apply the Prisma init migration to the remote Turso DB.
// Run with:  node --env-file=.env scripts/apply-turso.mjs
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !url.startsWith("libsql")) {
  throw new Error("TURSO_DATABASE_URL not set to a libsql:// URL");
}

const sql = readFileSync(
  "prisma/migrations/20260730023321_init/migration.sql",
  "utf8",
);

const client = createClient({ url, authToken });

// Guard against double-apply.
const existing = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'",
);
const tables = existing.rows.map((r) => r.name);
if (tables.includes("Vote")) {
  console.log("Schema already present on Turso. Tables:", tables.join(", "));
} else {
  await client.executeMultiple(sql);
  const after = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  console.log(
    "Applied schema. Tables now:",
    after.rows.map((r) => r.name).join(", "),
  );
}
client.close();
