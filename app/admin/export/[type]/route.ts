import { prisma } from "@/lib/prisma";
import { getAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote everything, and defuse spreadsheet formulas.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
const day = (d: Date) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const access = await getAccess();
  if (!access.isAdmin) return new Response("Not allowed", { status: 401 });

  const { type } = await params;
  let rows: unknown[][];

  if (type === "volunteers") {
    const list = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
    rows = [["Name", "Email", "Approved", "Signed up"], ...list.map((u) => [u.fullName, u.email, u.isApproved ? "yes" : "no", day(u.createdAt)])];
  } else if (type === "assignments") {
    const list = await prisma.serviceAssignment.findMany({
      include: { event: true, user: true, role: { include: { team: true } } },
      orderBy: { event: { eventDate: "asc" } },
    });
    rows = [
      ["Date", "Service", "Ministry", "Role", "Volunteer", "Email", "Status"],
      ...list.map((a) => [day(a.event.eventDate), a.event.title, a.role.team.name, a.role.name, a.user.fullName, a.user.email, a.status]),
    ];
  } else if (type === "services") {
    const list = await prisma.event.findMany({ orderBy: { eventDate: "asc" }, include: { _count: { select: { assignments: true } } } });
    rows = [["Date", "Title", "Notes", "People assigned"], ...list.map((e) => [day(e.eventDate), e.title, e.description, e._count.assignments])];
  } else {
    return new Response("Unknown export", { status: 404 });
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="church-planner-${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
