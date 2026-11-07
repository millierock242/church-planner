import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

// Optional manual trigger: /api/cron/reminders?key=YOUR_CRON_SECRET
// (The app also checks for reminders by itself every hour.)
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(request.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const result = await runReminders(true);
  return NextResponse.json(result);
}
