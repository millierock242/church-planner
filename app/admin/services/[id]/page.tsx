import { prisma } from "@/lib/prisma";
import { createAssignment, deleteAssignment, deleteEvent, copyRoster } from "@/app/actions";
import { getAccess, canManageTeam } from "@/lib/auth";
import ConfirmButton from "@/app/Components/ConfirmButton";
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

  const volunteers = await prisma.user.findMany({ where: { isApproved: true }, orderBy: { fullName: "asc" } });
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Assign Volunteer</h2>
        <form action={createAssignment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <input type="hidden" name="eventId" value={event.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Volunteer</label>
            <select name="userId" required className={field}>
              <option value="">Select volunteer...</option>
              {volunteers.map((vol) => (
                <option key={vol.id} value={vol.id}>{vol.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select name="roleId" required className={field}>
              <option value="">Select role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.team.name}: {role.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
            Assign
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-3">
          The app warns you if the person marked the day as unavailable or is already serving around that time.
        </p>
      </div>

      {otherEvents.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">Copy a Previous Roster</h2>
          <p className="text-xs text-gray-500 mb-4">
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
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Current Assignments</h2>
        <div className="space-y-3">
          {event.assignments.map((assignment) => (
            <div key={assignment.id} className="flex justify-between items-center gap-3 border-b pb-3">
              <div>
                <p className="font-medium text-gray-900">{assignment.user.fullName}</p>
                <p className="text-xs text-gray-500">{assignment.role.team.name} — {assignment.role.name}</p>
                {assignment.status === "swap_requested" && (
                  <p className="text-xs text-orange-700 mt-1">
                    Asked for a replacement{assignment.swapNote ? `: “${assignment.swapNote}”` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs rounded-full font-semibold capitalize ${statusStyle[assignment.status] ?? statusStyle.pending}`}>
                  {assignment.status.replace("_", " ")}
                </span>
                {canManageTeam(access, assignment.role.teamId) && (
                  <form action={deleteAssignment}>
                    <input type="hidden" name="id" value={assignment.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <ConfirmButton
                      message={`Remove ${assignment.user.fullName} from ${assignment.role.name}?`}
                      className="text-red-600 hover:text-red-800 text-xs font-medium cursor-pointer"
                    >
                      Remove
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>
          ))}
          {event.assignments.length === 0 && (
            <p className="text-sm text-gray-500">No volunteers assigned to this service yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
