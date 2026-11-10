import { prisma } from "@/lib/prisma";
import { createAssignment, deleteAssignment, deleteEvent, copyRoster } from "@/app/actions";
import { getAccess, canManageTeam } from "@/lib/auth";
import ConfirmButton from "@/app/Components/ConfirmButton";
import AssignForm from "@/app/Components/AssignForm";
import { notFound } from "next/navigation";
import Link from "next/link";

const field = "mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm";

const statusStyle: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  swap_requested: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    notice?: string;
    conflict?: string;
    userId?: string;
    roleId?: string;
    copied?: string;
    skipped?: string;
    role?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getAccess();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { user: true, role: { include: { team: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const volunteerRows = await prisma.user.findMany({
    where: { isApproved: true, status: "active" },
    orderBy: { fullName: "asc" },
    include: { memberships: true, qualifications: true },
  });
  // --- Who is free for THIS service? Worked out up front so there is no guessing. ---
  const dayStart = new Date(event.eventDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const twoHours = 2 * 60 * 60 * 1000;
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const [blockouts, nearby, recentRows] = await Promise.all([
    prisma.blockoutDate.findMany({ where: { date: { gte: dayStart, lt: dayEnd } } }),
    prisma.serviceAssignment.findMany({
      where: {
        eventId: { not: id },
        status: { not: "declined" },
        event: { eventDate: { gte: new Date(event.eventDate.getTime() - twoHours), lte: new Date(event.eventDate.getTime() + twoHours) } },
      },
      include: { event: true },
    }),
    prisma.serviceAssignment.findMany({
      where: { status: { not: "declined" }, event: { eventDate: { gte: fourWeeksAgo, lt: new Date() } } },
      select: { userId: true },
    }),
  ]);
  const blockedBy = new Map(blockouts.map((b) => [b.userId, b.note]));
  const hereAs = new Map<string, string[]>();
  for (const a of event.assignments) {
    if (a.status === "declined") continue;
    hereAs.set(a.userId, [...(hereAs.get(a.userId) ?? []), a.role.name]);
  }
  const nearbyAt = new Map<string, string[]>();
  for (const a of nearby) nearbyAt.set(a.userId, [...(nearbyAt.get(a.userId) ?? []), a.event.title]);
  const recentCount = new Map<string, number>();
  for (const r of recentRows) recentCount.set(r.userId, (recentCount.get(r.userId) ?? 0) + 1);

  const volunteers = volunteerRows.map((v) => ({
    id: v.id,
    name: v.fullName,
    teamIds: v.memberships.map((m) => m.teamId),
    roleIds: v.qualifications.map((q) => q.roleId),
    labels: (v.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    ...(() => {
      const reasons: string[] = [];
      let availability: "free" | "check" | "blocked" = "free";
      if (blockedBy.has(v.id)) {
        const note = blockedBy.get(v.id);
        reasons.push(`unavailable${note ? ` (${note})` : ""}`);
        availability = "blocked";
      }
      if (hereAs.has(v.id)) {
        reasons.push(`already here as ${hereAs.get(v.id)!.join(", ")}`);
        if (availability === "free") availability = "check";
      }
      if (nearbyAt.has(v.id)) {
        reasons.push(`also at "${nearbyAt.get(v.id)![0]}"`);
        if (availability === "free") availability = "check";
      }
      return { availability, reasons, recent: recentCount.get(v.id) ?? 0 };
    })(),
  }));
  const allRoles = await prisma.teamRole.findMany({ include: { team: true }, orderBy: { name: "asc" } });
  const roles = allRoles.filter((r) => canManageTeam(access, r.teamId));

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const otherEvents = await prisma.event.findMany({
    where: { id: { not: id }, eventDate: { gte: since } },
    orderBy: { eventDate: "desc" },
    take: 30,
  });

  const notice = sp.notice;

  // --- The live roster shown beside the form, grouped by ministry. ---
  type PanelItem =
    | { kind: "person"; id: string; roleId: string; roleName: string; teamId: string; name: string; status: string; swapNote: string | null }
    | { kind: "empty"; roleId: string; roleName: string; teamId: string };
  const panel = new Map<string, { name: string; items: PanelItem[] }>();
  const ensure = (teamId: string, name: string) => {
    if (!panel.has(teamId)) panel.set(teamId, { name, items: [] });
    return panel.get(teamId)!;
  };
  for (const a of event.assignments) {
    ensure(a.role.teamId, a.role.team.name).items.push({
      kind: "person",
      id: a.id,
      roleId: a.roleId,
      roleName: a.role.name,
      teamId: a.role.teamId,
      name: a.user.fullName,
      status: a.status,
      swapNote: a.swapNote,
    });
  }
  const unfilled = allRoles.filter(
    (r) => r.requiredByDefault && !event.assignments.some((a) => a.roleId === r.id && a.status !== "declined")
  );
  for (const r of unfilled) ensure(r.teamId, r.team.name).items.push({ kind: "empty", roleId: r.id, roleName: r.name, teamId: r.teamId });
  const panelTeams = Array.from(panel.values())
    .map((t) => ({ ...t, items: t.items.sort((x, y) => x.roleName.localeCompare(y.roleName)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const liveCount = event.assignments.filter((a) => a.status !== "declined").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(event.eventDate).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {access.isAdmin && (
            <>
              <Link href={`/admin/services/${event.id}/edit`} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">
                Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={event.id} />
                <ConfirmButton
                  message={`Delete "${event.title}" and all its assignments? This can't be undone.`}
                  className="border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 cursor-pointer"
                >
                  Delete
                </ConfirmButton>
              </form>
            </>
          )}
          <Link href={`/admin/services/${event.id}/print`} target="_blank" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
            Print / Export Roster
          </Link>
        </div>
      </div>

      {notice === "assigned" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Volunteer assigned and notified.</p>
      )}
      {notice === "copied" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">
          Copied {sp.copied ?? 0} assignment(s). Skipped {sp.skipped ?? 0} (already assigned, unavailable, or double-booked).
        </p>
      )}
      {(notice === "error" || notice === "missing" || notice === "copyerror") && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">Something went wrong. Please check your choices and try again.</p>
      )}
      {notice === "forbidden" && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">You can only schedule people for your own ministry.</p>
      )}
      {notice === "inactive" && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">That volunteer is on a break or inactive. Change their status first to schedule them.</p>
      )}
      {notice === "unapproved" && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">That volunteer hasn&apos;t been approved yet.</p>
      )}

      {sp.conflict && sp.userId && sp.roleId && (
        <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-300 p-4">
          <p className="text-sm font-semibold text-yellow-900 mb-1">Heads up before you assign:</p>
          <ul className="list-disc list-inside text-sm text-yellow-900 mb-3">
            {sp.conflict.split("; ").map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <form action={createAssignment} className="flex flex-wrap gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="userId" value={sp.userId} />
            <input type="hidden" name="roleId" value={sp.roleId} />
            <input type="hidden" name="override" value="1" />
            <button type="submit" className="bg-yellow-500 text-yellow-950 px-4 py-2 rounded-md text-sm font-semibold hover:bg-yellow-400 cursor-pointer">
              Assign anyway
            </button>
            <Link href={`/admin/services/${event.id}`} className="px-4 py-2 text-sm text-gray-700 hover:underline">
              Cancel
            </Link>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* LEFT: assign someone */}
        <div className="lg:col-span-3 space-y-6">
          <div id="assign" className="bg-white shadow rounded-lg p-6 scroll-mt-4">
            <h2 className="text-lg font-semibold mb-1">Assign a Volunteer</h2>
            <p className="text-xs text-gray-500 mb-4">
              Pick a role and the list sorts itself for {event.title}: who is free, who is already serving, and who is off.
            </p>
            <AssignForm
              action={createAssignment}
              eventId={event.id}
              volunteers={volunteers}
              roles={roles.map((r) => ({ id: r.id, name: r.name, teamId: r.teamId, teamName: r.team.name }))}
              initialRoleId={sp.role ?? ""}
            />
          </div>

          {otherEvents.length > 0 && (
            <details className="bg-white shadow rounded-lg p-6">
              <summary className="cursor-pointer text-lg font-semibold">Copy a Previous Roster</summary>
              <p className="text-xs text-gray-500 mt-2 mb-4">
                Brings over the same people in the same roles{access.isAdmin ? "" : " (your ministry only)"}. Anyone unavailable or already assigned is skipped.
              </p>
              <form action={copyRoster} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <input type="hidden" name="toEventId" value={event.id} />
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Copy from</label>
                  <select name="fromEventId" required className={field}>
                    <option value="">Select a service...</option>
                    {otherEvents.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} — {new Date(e.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-gray-800 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 cursor-pointer">
                  Copy Roster
                </button>
                <label className="sm:col-span-3 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="notify" value="1" className="h-4 w-4 rounded border-gray-300" />
                  Also email everyone their invite
                </label>
              </form>
            </details>
          )}
        </div>

        {/* RIGHT: who is on this service right now */}
        <aside className="lg:col-span-2 lg:sticky lg:top-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-lg font-semibold">On this service</h2>
              <span className="text-xs text-gray-500">{liveCount} {liveCount === 1 ? "person" : "people"}</span>
            </div>
            {unfilled.length > 0 && (
              <p className="text-xs text-amber-700 mb-3">
                {unfilled.length} needed {unfilled.length === 1 ? "role has" : "roles have"} nobody yet.
              </p>
            )}

            {panelTeams.length === 0 && (
              <p className="text-sm text-gray-500 mt-3">Nobody is assigned yet. Pick a role on the left to start.</p>
            )}

            <div className="space-y-5 mt-3">
              {panelTeams.map((team) => (
                <div key={team.name}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-1">{team.name}</h3>
                  <ul className="divide-y divide-gray-100">
                    {team.items.map((item) =>
                      item.kind === "empty" ? (
                        <li key={`empty-${item.roleId}`} className="py-2 flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-600">{item.roleName}</span>
                          {canManageTeam(access, item.teamId) ? (
                            <Link href={`/admin/services/${event.id}?role=${item.roleId}#assign`} className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100">
                              Needs someone — fill
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-amber-700">Needs someone</span>
                          )}
                        </li>
                      ) : (
                        <li key={item.id} className="py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${item.status === "declined" ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.name}</p>
                              <p className="text-xs text-gray-500">{item.roleName}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-semibold capitalize ${statusStyle[item.status] ?? statusStyle.pending}`}>
                                {item.status.replace("_", " ")}
                              </span>
                              {canManageTeam(access, item.teamId) && (
                                <form action={deleteAssignment}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="eventId" value={event.id} />
                                  <ConfirmButton
                                    message={`Remove ${item.name} from ${item.roleName}?`}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium cursor-pointer"
                                  >
                                    Remove
                                  </ConfirmButton>
                                </form>
                              )}
                            </div>
                          </div>
                          {item.status === "swap_requested" && (
                            <p className="text-xs text-orange-700 mt-1">
                              Asked for a replacement{item.swapNote ? `: “${item.swapNote}”` : ""}
                            </p>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
