// Runs once when the server starts. Checks for reminders to send every hour.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as { __reminderTimer?: ReturnType<typeof setInterval> };
  if (g.__reminderTimer) return;

  const run = async () => {
    try {
      const { runReminders } = await import("./lib/reminders");
      const result = await runReminders();
      if (result.sent > 0) console.log(`[REMINDERS] Sent ${result.sent} reminder(s)`);
    } catch (error) {
      console.error("[REMINDERS] Failed:", error);
    }
  };

  g.__reminderTimer = setInterval(run, 60 * 60 * 1000);
  setTimeout(run, 90 * 1000);
}
