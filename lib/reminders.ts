import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/notifications";

// Sends "please confirm" (about 3 days out, only if still pending) and
// "see you soon" (within 24 hours) reminders. Each reminder is sent once.
// Only runs between 8am and 8pm local time (set TZ=America/Nassau on Railway).
export async function runReminders(force = false): Promise<{ sent: number; skipped?: boolean }> {
  const now = new Date();
  const hour = now.getHours();
  if (!force && (hour < 8 || hour >= 20)) return { sent: 0, skipped: true };

  const in72 = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const list = await prisma.serviceAssignment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      event: { eventDate: { gt: now, lte: in72 } },
      user: { isApproved: true, status: "active", email: { not: null } },
    },
    include: { event: true, user: true, role: true },
  });

  let sent = 0;
  for (const a of list) {
    const hoursAway = (a.event.eventDate.getTime() - now.getTime()) / (60 * 60 * 1000);
    let kind: "confirm" | "tomorrow" | null = null;

    if (hoursAway <= 24 && !a.reminder1dSentAt) {
      kind = "tomorrow";
      await prisma.serviceAssignment.update({
        where: { id: a.id },
        data: { reminder1dSentAt: now, reminder3dSentAt: a.reminder3dSentAt ?? now },
      });
    } else if (hoursAway > 24 && a.status === "pending" && !a.reminder3dSentAt) {
      kind = "confirm";
      await prisma.serviceAssignment.update({ where: { id: a.id }, data: { reminder3dSentAt: now } });
    }

    if (kind) {
      await sendReminderEmail({
        kind,
        toEmail: a.user.email,
        volunteerName: a.user.fullName,
        eventTitle: a.event.title,
        eventDate: a.event.eventDate,
        roleName: a.role.name,
        accessToken: a.user.accessToken,
      });
      sent++;
    }
  }
  return { sent };
}
