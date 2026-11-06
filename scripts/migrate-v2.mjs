// One-time helper: upgrades your Turso database for the new features
// (private links, block-out dates, swap requests, reminders, ministry leaders).
// Safe to run more than once.
import { createClient } from "@libsql/client";
import { randomBytes } from "node:crypto";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("\n❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing.\n");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function columns(table) {
  const info = await client.execute(`PRAGMA table_info("${table}")`);
  return info.rows.map((r) => r.name);
}

async function addColumn(table, column, definition) {
  const have = await columns(table);
  if (have.length === 0) throw new Error(`The ${table} table doesn't exist yet. Run scripts/setup-db.mjs first.`);
  if (have.includes(column)) {
    console.log(`✔ ${table}.${column} already exists`);
  } else {
    await client.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`✅ Added ${table}.${column}`);
  }
}

try {
  // Safety net in case the earlier approval step was skipped.
  await addColumn("User", "isApproved", "BOOLEAN NOT NULL DEFAULT true");
  await addColumn("User", "accessToken", "TEXT");
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "User_accessToken_key" ON "User"("accessToken")');
  await addColumn("Team", "leaderPasswordHash", "TEXT");
  await addColumn("TeamRole", "requiredByDefault", "BOOLEAN NOT NULL DEFAULT false");
  await addColumn("ServiceAssignment", "swapNote", "TEXT");
  await addColumn("ServiceAssignment", "reminder3dSentAt", "DATETIME");
  await addColumn("ServiceAssignment", "reminder1dSentAt", "DATETIME");

  await client.execute(`CREATE TABLE IF NOT EXISTS "BlockoutDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockoutDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  console.log("✔ BlockoutDate table ready");

  // Give every existing volunteer a private link.
  const missing = await client.execute('SELECT "id" FROM "User" WHERE "accessToken" IS NULL');
  for (const row of missing.rows) {
    await client.execute({
      sql: 'UPDATE "User" SET "accessToken" = ? WHERE "id" = ?',
      args: [randomBytes(16).toString("hex"), row.id],
    });
  }
  console.log(`✅ Private links created for ${missing.rows.length} volunteer(s)`);

  console.log("\nAll done! You can now push the new code.\n");
} catch (err) {
  console.error("\n❌ Something went wrong:", err.message, "\n");
  process.exit(1);
}
