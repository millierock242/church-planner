import { prisma } from "@/lib/prisma";
import RosterToggle from "@/app/Components/RosterToggle";
import Link from "next/link";

const statusStyle: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  swap_requested: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
};

type RosterEvent = Awaited<ReturnType<typeof loadEvents>>[number];

function loadEvents(where: object, order: "asc" | "desc", take: number) {
  return prisma.event.findMany({
    where,
    orderBy: { eventDate: order },
    take,
    include: {
      assignments: {
        include: { user: true, role: { include: { team: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const dateText = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function ServiceDropdown({ event, open }: { event: RosterEvent; open: boolean }) {
  const live = event.assignments.filter((a) => a.status !== "declined");
  const count = (s: string) => event.assignments.filter((a) => a.status === s).length;
  const confirmed = count("confirmed");
  const pending = count("pending");
  const attention = count("declined") + count("swap_requested");

  return (
    <details data-service open={open} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <summary className="list-none cursor-pointer px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 transition-transform group-open:rotate-90">▶</span>
          <div>
            <p className="text-base font-bold text-gray-900">{event.title}</p>
            <p className="text-xs text-gray-500">{dateText(event.eventDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
            {live.length} {live.length === 1 ? "person" : "people"}
          </span>
          {confirmed > 0 && <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-medium">{confirmed} confirmed</span>}
          {pending > 0 && <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">{pending} waiting</span>}
          {attention > 0 && <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">{attention} need attention</span>}
        </div>
      </summary>

      <div className="border-t border-gray-200">
        {event.assignments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500 italic">Nobody is assigned to this service yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Volunteer</th>
                  <th className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ministry / Role</th>
                  <th className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...event.assignments]
                  .sort((a, b) => a.role.team.name.localeCompare(b.role.team.name) || a.role.name.localeCompare(b.role.name))
                  .map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{a.user.fullName}</p>
                        <p className="text-xs text-gray-400">{a.user.email || "No email"}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md">{a.role.team.name}</span>
                        <p className="text-xs text-gray-600 mt-1">{a.role.name}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[a.status] ?? statusStyle.pending}`}>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 print:hidden">
          <Link href={`/admin/services/${event.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
            Manage this service →
          </Link>
        </div>
      </div>
    </details>
  );
}

export default async function MasterRosterPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [upcoming, past] = await Promise.all([
    loadEvents({ eventDate: { gte: startOfToday } }, "asc", 80),
    loadEvents({ eventDate: { lt: startOfToday } }, "desc", 30),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Master Service Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Tap a service to see who is serving.</p>
        </div>
        <RosterToggle />
      </div>

      <div className="space-y-3">
        {upcoming.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500 italic">No upcoming services yet.</p>
            <Link href="/admin/services" className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline">
              Go to services →
            </Link>
          </div>
        )}
        {upcoming.map((event, i) => (
          <ServiceDropdown key={event.id} event={event} open={i === 0} />
        ))}
      </div>

      {past.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-900 mb-3 print:hidden">
            Past services ({past.length} most recent)
          </summary>
          <div className="space-y-3 mt-3">
            {past.map((event) => (
              <ServiceDropdown key={event.id} event={event} open={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
