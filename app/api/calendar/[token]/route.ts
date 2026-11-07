import * as ics from "ics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EMPTY = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Church Planner//EN\r\nEND:VCALENDAR\r\n";

// A calendar feed that always lists this volunteer's upcoming assignments.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "");

  const user = await prisma.user.findUnique({ where: { accessToken: token } });
  if (!user) return new Response("Not found", { status: 404 });

  const from = new Date();
  from.setDate(from.getDate() - 1);
  const assignments = await prisma.serviceAssignment.findMany({
    where: { userId: user.id, status: { not: "declined" }, event: { eventDate: { gte: from } } },
    include: { event: true, role: { include: { team: true } } },
    orderBy: { event: { eventDate: "asc" } },
  });

  const events: ics.EventAttributes[] = assignments.map((a) => {
    const d = new Date(a.event.eventDate);
    return {
      uid: `${a.id}@church-planner`,
      title: `${a.event.title} - ${a.role.name}`,
      description: `Serving as ${a.role.name} (${a.role.team.name}).`,
      start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()],
      duration: { hours: 2 },
      status: a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE",
    } as ics.EventAttributes;
  });

  let body = EMPTY;
  if (events.length > 0) {
    const { error, value } = ics.createEvents(events);
    if (!error && value) {
      body = value.replace(/BEGIN:VCALENDAR\r?\n/, "BEGIN:VCALENDAR\r\nX-WR-CALNAME:My Church Schedule\r\n");
    }
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
