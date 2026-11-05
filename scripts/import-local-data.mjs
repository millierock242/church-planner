// One-time helper: copies the teams, roles, volunteers, services and
// assignments from your local prisma/dev.db into your Turso database.
// Safe to run more than once (it skips anything already copied).
import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("\n❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing.\n");
  process.exit(1);
}
if (!existsSync("prisma/dev.db")) {
  console.error("\n❌ Can't find prisma/dev.db. Run this from the project folder.\n");
  process.exit(1);
}

const local = createClient({ url: "file:prisma/dev.db" });
const cloud = createClient({ url, authToken });

// Order matters: parents before the rows that point at them.
const tables = [
  { name: "Team", cols: ["id", "name", "description", "createdAt", "updatedAt"] },
  { name: "TeamRole", cols: ["id", "name", "teamId", "createdAt", "updatedAt"] },
  { name: "User", cols: ["id", "fullName", "email", "createdAt", "updatedAt"] },
  { name: "Event", cols: ["id", "title", "eventDate", "description", "createdAt", "updatedAt"] },
  { name: "ServiceAssignment", cols: ["id", "eventId", "userId", "roleId", "status", "createdAt", "updatedAt"] },
];

try {
  for (const { name, cols } of tables) {
    const rows = (await local.execute(`SELECT * FROM "${name}"`)).rows;
    const stmts = rows.map((row) => {
      const args = cols.map((c) => {
        // older local tables may lack updatedAt: reuse createdAt
        const v = row[c] ?? (c === "updatedAt" ? row["createdAt"] : null);
        // tidy accidental spaces like "Keys "
        return typeof v === "string" && (c === "name" || c === "fullName" || c === "title") ? v.trim() : v;
      });
      return {
        sql: `INSERT OR IGNORE INTO "${name}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        args,
      };
    });
    if (stmts.length) await cloud.batch(stmts, "write");
    console.log(`✅ ${name}: ${rows.length} row(s) copied`);
  }
  console.log("\nAll done! Refresh your site to see the data.\n");
} catch (err) {
  console.error("\n❌ Something went wrong:", err.message, "\n");
  process.exit(1);
}
