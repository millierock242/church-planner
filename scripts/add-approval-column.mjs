// One-time helper: adds the "isApproved" column to your Turso database.
// Everyone already in the list stays approved. Safe to run more than once.
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("\n❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing.\n");
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  const info = await client.execute('PRAGMA table_info("User")');
  const have = info.rows.map((r) => r.name);
  if (have.length === 0) throw new Error("The User table doesn't exist yet. Run scripts/setup-db.mjs first.");

  if (have.includes("isApproved")) {
    console.log("✔ isApproved already exists, nothing to do");
  } else {
    await client.execute('ALTER TABLE "User" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT true');
    console.log("✅ Added isApproved (all existing volunteers are approved)");
  }
  console.log("\nAll done! You can now push the new code.\n");
} catch (err) {
  console.error("\n❌ Something went wrong:", err.message, "\n");
  process.exit(1);
}
