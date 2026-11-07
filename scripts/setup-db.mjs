// One-time helper: creates the tables in your Turso database.
// Safe to run more than once.
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("\n❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing.");
  console.error("   Make sure prisma/.env contains both lines, then try again.\n");
  process.exit(1);
}

const sql = readFileSync(new URL("../turso-schema.sql", import.meta.url), "utf8");
const client = createClient({ url, authToken });

try {
  await client.executeMultiple(sql);
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("\n✅ Done! Tables in your Turso database:");
  for (const row of result.rows) console.log("   - " + row.name);
  console.log("");
} catch (err) {
  console.error("\n❌ Something went wrong:", err.message, "\n");
  process.exit(1);
}
