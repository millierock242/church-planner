import { prisma } from "@/lib/prisma";
import { reassignAssignment, keepAssignment } from "@/app/actions";
import { getAccess } from "@/lib/auth";
import Link from "next/link";

const when = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const card = "bg-white shadow rounded-lg p-6 mb-6";

export default async function TodoPage() {
  const access = await getAccess();
  const teamFilter = access.isAdmin ? {} : { role: { teamId: access.leaderTeamId ?? "" } };

  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [swaps, declined, waiting, pendingApprovals, volunteers, events] = await Promise.all([
    prisma.serviceAssignment.findMany({
      where: { status: "swap_requested", event: { eventDate: { gte: now } }, ...teamFilter },
      include: { user: true, event: true, role: { include: { team: true } } },
      orderBy: { event: { eventDate: "asc" } },
    }),
    prisma.serviceAssignment.findMany({
      where: { status: "declined", event: { eventDate: { gte: now } }, ...teamFilter },
      include: { user: true, event: true, role: { include: { team: true } } },
      orderBy: { event: { eventDate: "asc" } },
    }),
    prisma.serviceAssignment.findMany({
      where: { status: "pending", event: { eventDate: { gte: now, lte: in14 } }, ...teamFilter },
      include: { user: true, event: true, role: { include: { team: true } } },
      orderBy: { event: { eventDate: "asc" } },
    }),
    access.isAdmin ? prisma.user.count({ where: { isApproved: false } }) : Promise.resolve(0),
    prisma.user.findMany({
      where: { isApproved: true, status: "active" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, qualifications: { select: { roleId: true } } },
    }),
    prisma.event.findMany({
      where: { eventDate: { gte: now, lte: in60 } },
      orderBy: { eventDate: "asc" },
      include: { assignments: true },
      take: 12,
    }),
  ]);

  const neededRoles = await prisma.teamRole.findMany({
    where: { requiredByDefault: true, ...(access.isAdmin ? {} : { teamId: access.leaderTeamId ?? "" }) },
    include: { team: true },
    orderBy: { name: "asc" },
  });

  const unfilled = events
    .map((e) => ({
      event: e,
      missing: neededRoles.filter(
        (r) => !e.assignments.some((a) => a.roleId === r.id && (a.status === "pending" || a.status === "confirmed"))
      ),
    }))
    .filter((x) => x.missing.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">To-Do</h1>
      <p className="text-sm text-gray-500 mb-6">
        {access.isAdmin ? "Everything that needs your attention." : "Everything that needs attention in your ministry."}
      </p>

      {pendingApprovals > 0 && (
        <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-300 p-4 flex items-center justify-between">
          <p className="text-sm text-yellow-900">
            <strong>{pendingApprovals}</strong> new volunteer sign-up{pendingApprovals === 1 ? " is" : "s are"} waiting for approval.
          </p>
          <Link href="/admin/volunteers" className="text-sm font-semibold text-yellow-900 underline">Review →</Link>
        </div>
      )}

      <section className={card}>
        <h2 className="text-lg font-semibold mb-3">Replacement requests ({swaps.length})</h2>
        {swaps.length === 0 && <p className="text-sm text-gray-400 italic">Nobody has asked for a replacement.</p>}
        <div className="space-y-4">
          {swaps.map((a) => (
            <div key={a.id} className="border border-orange-200 bg-orange-50 rounded-md p-4">
              <p className="text-sm text-gray-900">
                <strong>{a.user.fullName}</strong> can&apos;t serve as <strong>{a.role.name}</strong> ({a.role.team.name}) at{" "}
                <Link href={`/admin/services/${a.eventId}`} className="underline">{a.event.title}</Link>, {when(a.event.eventDate)}.
              </p>
              {a.swapNote && <p className="text-xs text-orange-800 mt-1">Note: “{a.swapNote}”</p>}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <form action={reassignAssignment} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <select name="newUserId" required className="rounded-md border border-gray-300 p-2 text-sm">
                    <option value="">Replace with...</option>
                    <optgroup label={`Trained for ${a.role.name}`}>
                      {volunteers
                        .filter((v) => v.id !== a.userId && v.qualifications.some((q) => q.roleId === a.roleId))
                        .map((v) => (
                          <option key={v.id} value={v.id}>{v.fullName}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Everyone else">
                      {volunteers
                        .filter((v) => v.id !== a.userId && !v.qualifications.some((q) => q.roleId === a.roleId))
                        .map((v) => (
                          <option key={v.id} value={v.id}>{v.fullName}</option>
                        ))}
                    </optgroup>
                  </select>
                  <button type="submit" className="bg-brand-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
                    Replace &amp; notify
                  </button>
                </form>
                <form action={keepAssignment}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="text-sm text-gray-600 hover:underline cursor-pointer">Keep {a.user.fullName.split(" ")[0]} (cancel request)</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-3">Declined — needs a replacement ({declined.length})</h2>
        {declined.length === 0 && <p className="text-sm text-gray-400 italic">No declined assignments.</p>}
        <ul className="divide-y divide-gray-100">
          {declined.map((a) => (
            <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>{a.user.fullName}</strong> declined {a.role.name} — {a.event.title}, {when(a.event.eventDate)}
              </span>
              <Link href={`/admin/services/${a.eventId}`} className="text-brand-700 font-medium hover:underline">Fix →</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-1">Roles with nobody assigned ({unfilled.reduce((n, x) => n + x.missing.length, 0)})</h2>
        <p className="text-xs text-gray-500 mb-3">
          Based on the roles marked “Needed every service” on the Ministries page, for the next 60 days.
        </p>
        {neededRoles.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No roles are marked as needed yet.{access.isAdmin ? " Go to Ministries and tap “Optional” beside the roles you need at every service." : ""}
          </p>
        )}
        {neededRoles.length > 0 && unfilled.length === 0 && <p className="text-sm text-green-700">All needed roles are filled. 🎉</p>}
        <ul className="divide-y divide-gray-100">
          {unfilled.map(({ event, missing }) => (
            <li key={event.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{event.title} — {when(event.eventDate)}</p>
                <Link href={`/admin/services/${event.id}`} className="text-brand-700 text-sm font-medium hover:underline">Assign →</Link>
              </div>
              <p className="text-xs text-gray-600 mt-1">Needs: {missing.map((r) => `${r.name} (${r.team.name})`).join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-3">Not confirmed yet — next 14 days ({waiting.length})</h2>
        {waiting.length === 0 && <p className="text-sm text-gray-400 italic">Everyone coming up has replied.</p>}
        <ul className="divide-y divide-gray-100">
          {waiting.map((a) => (
            <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>{a.user.fullName}</strong> — {a.role.name}, {a.event.title}, {when(a.event.eventDate)}
              </span>
              <Link href={`/admin/services/${a.eventId}`} className="text-brand-700 font-medium hover:underline">Open →</Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">Reminder emails go out automatically about 3 days and 1 day before a service.</p>
      </section>
    </div>
  );
}
