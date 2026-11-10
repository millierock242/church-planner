import { prisma } from "@/lib/prisma";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Returns plain-English reasons why scheduling this person would be a problem.
// An empty list means no conflicts.
export async function findConflicts(
  userId: string,
  event: { id: string; eventDate: Date },
  roleId?: string
): Promise<string[]> {
  const reasons: string[] = [];
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const name = user?.fullName ?? "This volunteer";

  const dayStart = startOfDay(event.eventDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const blockout = await prisma.blockoutDate.findFirst({
    where: { userId, date: { gte: dayStart, lt: dayEnd } },
  });
  if (blockout) {
    reasons.push(`${name} marked this day as unavailable${blockout.note ? ` (${blockout.note})` : ""}`);
  }

  const sameEvent = await prisma.serviceAssignment.findMany({
    where: { userId, eventId: event.id, status: { not: "declined" } },
    include: { role: true },
  });
  if (sameEvent.length > 0) {
    const same = roleId && sameEvent.some((a) => a.roleId === roleId);
    reasons.push(
      same
        ? `${name} is already assigned to that role at this service`
        : `${name} is already serving at this service as ${sameEvent.map((a) => a.role.name).join(", ")}`
    );
  }

  // Another service within 2 hours before or after.
  const from = new Date(event.eventDate.getTime() - 2 * 60 * 60 * 1000);
  const to = new Date(event.eventDate.getTime() + 2 * 60 * 60 * 1000);
  const nearby = await prisma.serviceAssignment.findMany({
    where: { userId, eventId: { not: event.id }, status: { not: "declined" }, event: { eventDate: { gte: from, lte: to } } },
    include: { event: true },
  });
  for (const a of nearby) {
    reasons.push(`${name} is also scheduled for "${a.event.title}" within 2 hours of this service`);
  }

  return reasons;
}

export { startOfDay };
