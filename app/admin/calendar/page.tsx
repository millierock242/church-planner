import { prisma } from "@/lib/prisma";
import PrintButton from "@/app/Components/PrintButton";
import Link from "next/link";

function parseMonth(value?: string): Date {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    if (!isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const first = parseMonth(month);
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  const prev = new Date(first.getFullYear(), first.getMonth() - 1, 1);

  const events = await prisma.event.findMany({
    where: { eventDate: { gte: first, lt: next } },
    orderBy: { eventDate: "asc" },
    include: { assignments: { include: { user: true, role: true } } },
  });

  // Build weeks (Sunday first).
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor < next || weeks.length < 4) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor >= next) break;
  }

  const eventsOn = (d: Date) =>
    events.filter((e) => {
      const x = new Date(e.eventDate);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
    });

  const title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2 print:hidden">
          <Link href={`/admin/calendar?month=${key(prev)}`} className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">← Previous</Link>
          <Link href="/admin/calendar" className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Today</Link>
          <Link href={`/admin/calendar?month=${key(next)}`} className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Next →</Link>
          <PrintButton>Print this month</PrintButton>
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-l border-gray-300 bg-white text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-r border-b border-gray-300 bg-gray-100 px-2 py-1 font-semibold text-gray-700">{d}</div>
        ))}
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === first.getMonth();
          const list = eventsOn(day);
          return (
            <div key={day.toISOString()} className={`border-r border-b border-gray-300 min-h-28 p-1.5 align-top ${inMonth ? "" : "bg-gray-50 text-gray-400"}`}>
              <div className="font-semibold">{day.getDate()}</div>
              {inMonth && list.map((e) => (
                <div key={e.id} className="mt-1 rounded bg-brand-50 border border-brand-200 p-1">
                  <Link href={`/admin/services/${e.id}`} className="font-semibold text-brand-800 block leading-tight print:no-underline">
                    {new Date(e.eventDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} {e.title}
                  </Link>
                  {e.assignments.filter((a) => a.status !== "declined").map((a) => (
                    <div key={a.id} className="text-[10px] leading-tight text-gray-700">{a.role.name}: {a.user.fullName}</div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
