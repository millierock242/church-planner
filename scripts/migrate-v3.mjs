// One-time helper: upgrades your Turso database for volunteer categories
// (status, labels, ministry membership, role training). Safe to run more than once.
import { createClient } from "@libsql/client";

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
  if (have.length === 0) throw new Error(`The ${table} table doesn't exist yet. Run scripts/migrate-v2.mjs first.`);
  if (have.includes(column)) {
    console.log(`✔ ${table}.${column} already exists`);
  } else {
    await client.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`✅ Added ${table}.${column}`);
  }
}

try {
  await addColumn("User", "status", "TEXT NOT NULL DEFAULT 'active'");
  await addColumn("User", "tags", "TEXT");

  await client.execute(`CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_userId_teamId_key" ON "TeamMember"("userId", "teamId")');
  console.log("✔ TeamMember table ready");

  await client.execute(`CREATE TABLE IF NOT EXISTS "RoleQualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "RoleQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleQualification_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TeamRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "RoleQualification_userId_roleId_key" ON "RoleQualification"("userId", "roleId")');
  console.log("✔ RoleQualification table ready");

  // Everyone who has already served in a ministry/role starts out as a member/trained for it.
  const members = await client.execute(`INSERT OR IGNORE INTO "TeamMember" ("id", "userId", "teamId")
    SELECT lower(hex(randomblob(12))), a."userId", r."teamId"
    FROM "ServiceAssignment" a JOIN "TeamRole" r ON r."id" = a."roleId"
    GROUP BY a."userId", r."teamId"`);
  const quals = await client.execute(`INSERT OR IGNORE INTO "RoleQualification" ("id", "userId", "roleId")
    SELECT lower(hex(randomblob(12))), a."userId", a."roleId"
    FROM "ServiceAssignment" a GROUP BY a."userId", a."roleId"`);
  console.log(`✅ Filled in ${members.rowsAffected} ministry membership(s) and ${quals.rowsAffected} role(s) from past assignments`);

  console.log("\nAll done! You can now push the new code.\n");
} catch (err) {
  console.error("\n❌ Something went wrong:", err.message, "\n");
  process.exit(1);
}
