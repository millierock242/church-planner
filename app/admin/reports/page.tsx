import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";

const shortDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default async function ReportsPage() {
  await requireAdminPage();
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const volunteers = await prisma.user.findMany({
    where: { isApproved: true },
    orderBy: { fullName: "asc" },
    include: { assignments: { include: { event: true } } },
  });

  const rows = volunteers.map((v) => {
    const past = v.assignments.filter((a) => a.event.eventDate < now);
    const served = past.filter((a) => a.status === "confirmed" || a.status === "pending");
    const declined = v.assignments.filter((a) => a.status === "declined").length;
    const answered = v.assignments.filter((a) => a.status !== "pending").length;
    const confirmedCount = v.assignments.filter((a) => a.status === "confirmed").length;
    const lastServed = served.reduce<Date | null>((m, a) => (!m || a.event.eventDate > m ? a.event.eventDate : m), null);
    const upcoming = v.assignments
      .filter((a) => a.event.eventDate >= now && a.status !== "declined")
      .sort((a, b) => a.event.eventDate.getTime() - b.event.eventDate.getTime());
    const recent = served.filter((a) => a.event.eventDate >= eightWeeksAgo).length;
    return {
      id: v.id,
      name: v.fullName,
      served: served.length,
      declined,
      rate: v.assignments.length ? Math.round((confirmedCount / v.assignments.length) * 100) : null,
      answeredRate: answered,
      lastServed,
      next: upcoming[0]?.event.eventDate ?? null,
      recent,
    };
  });

  const busy = rows.filter((r) => r.recent >= 4).sort((a, b) => b.recent - a.recent);
  const idle = rows.filter((r) => !r.next && (!r.lastServed || r.lastServed < sixtyDaysAgo));
  const top = [...rows].sort((a, b) => b.served - a.served).filter((r) => r.served > 0).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-6">A quick look at who is serving, who may need a rest, and who could be invited back.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Most active (all time)</h2>
          {top.length === 0 ? <p className="text-sm text-gray-400 italic">Nothing yet.</p> : (
            <ol className="text-sm text-gray-800 space-y-1">
              {top.map((r) => <li key={r.id}>{r.name} <span className="text-gray-500">— {r.served}</span></li>)}
            </ol>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Serving a lot lately</h2>
          <p className="text-xs text-gray-500 mb-2">4+ times in the last 8 weeks. Check in so nobody burns out.</p>
          {busy.length === 0 ? <p className="text-sm text-gray-400 italic">Nobody.</p> : (
            <ul className="text-sm text-gray-800 space-y-1">
              {busy.map((r) => <li key={r.id}>{r.name} <span className="text-gray-500">— {r.recent}</span></li>)}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Could be invited back</h2>
          <p className="text-xs text-gray-500 mb-2">Not scheduled, and haven’t served in 60+ days.</p>
          {idle.length === 0 ? <p className="text-sm text-gray-400 italic">Nobody.</p> : (
            <ul className="text-sm text-gray-800 space-y-1">
              {idle.slice(0, 10).map((r) => <li key={r.id}>{r.name}</li>)}
              {idle.length > 10 && <li className="text-gray-500">…and {idle.length - 10} more</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Volunteer</th>
              <th className="px-4 py-3">Times served</th>
              <th className="px-4 py-3">Declined</th>
              <th className="px-4 py-3">Confirmed</th>
              <th className="px-4 py-3">Last served</th>
              <th className="px-4 py-3">Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3">{r.served}</td>
                <td className="px-4 py-3">{r.declined}</td>
                <td className="px-4 py-3">{r.rate === null ? "—" : `${r.rate}%`}</td>
                <td className="px-4 py-3">{shortDate(r.lastServed)}</td>
                <td className="px-4 py-3">{shortDate(r.next)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">No volunteers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">“Confirmed” is the share of a person’s assignments they have confirmed. “Times served” counts past assignments that weren’t declined.</p>
    </div>
  );
}
