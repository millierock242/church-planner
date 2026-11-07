import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addVolunteer, approveVolunteer, deleteVolunteer } from "@/app/actions";
import ConfirmButton from "@/app/Components/ConfirmButton";
import Link from "next/link";

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; q?: string; ministry?: string; status?: string; label?: string }>;
}) {
  await requireAdminPage();
  const { added, q = "", ministry = "", status = "", label = "" } = await searchParams;
  const everyone = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: {
      _count: { select: { assignments: true } },
      memberships: { include: { team: true } },
      qualifications: true,
    },
  });
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const pending = everyone.filter((v) => !v.isApproved);
  const approved = everyone.filter((v) => v.isApproved);
  const tagsOf = (v: { tags: string | null }) => (v.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const allLabels = Array.from(new Set(approved.flatMap(tagsOf))).sort();

  const needle = q.trim().toLowerCase();
  const volunteers = approved.filter((v) => {
    if (needle && !v.fullName.toLowerCase().includes(needle) && !(v.email ?? "").toLowerCase().includes(needle)) return false;
    if (ministry && !v.memberships.some((m) => m.teamId === ministry)) return false;
    if (status && v.status !== status) return false;
    if (label && !tagsOf(v).some((t) => t.toLowerCase() === label.toLowerCase())) return false;
    return true;
  });
  const statusBadge: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    on_break: "bg-yellow-100 text-yellow-800",
    inactive: "bg-gray-200 text-gray-700",
  };
  const statusName: Record<string, string> = { active: "Active", on_break: "On a break", inactive: "Inactive" };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Volunteers</h1>
      </div>


      {added === "approved" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Volunteer approved. They can now be scheduled.</p>
      )}
      {added === "saved" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Changes saved.</p>
      )}
      {added === "ok" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Volunteer added.</p>
      )}
      {(added === "error" || added === "missing") && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {added === "missing" ? "Please enter a name." : "Couldn't add that volunteer. Is the email already on the list?"}
        </p>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add Volunteer</h2>
        <form action={addVolunteer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="fullName" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
            <input type="email" name="email" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
            Add Volunteer
          </button>
        </form>
      </div>

      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 shadow overflow-hidden sm:rounded-md mb-8">
          <h2 className="px-6 py-3 text-sm font-semibold text-yellow-900 border-b border-yellow-200">
            Waiting for approval ({pending.length})
          </h2>
          <ul className="divide-y divide-yellow-200">
            {pending.map((vol) => (
              <li key={vol.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{vol.fullName}</p>
                  <p className="text-xs text-gray-600">{vol.email || "No email provided"}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <form action={approveVolunteer}>
                    <input type="hidden" name="id" value={vol.id} />
                    <button type="submit" className="bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
                      Approve
                    </button>
                  </form>
                  <form action={deleteVolunteer}>
                    <input type="hidden" name="id" value={vol.id} />
                    <ConfirmButton
                      message={`Reject and delete ${vol.fullName}'s sign-up?`}
                      className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                    >
                      Reject
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form method="get" className="bg-white shadow rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Search</label>
          <input type="text" name="q" defaultValue={q} placeholder="Name or email" className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Ministry</label>
          <select name="ministry" defaultValue={ministry} className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm">
            <option value="">All</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <select name="status" defaultValue={status} className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="on_break">On a break</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Label</label>
          <select name="label" defaultValue={label} className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm">
            <option value="">All</option>
            {allLabels.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-5 flex items-center gap-3">
          <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 cursor-pointer">Filter</button>
          <Link href="/admin/volunteers" className="text-sm text-gray-600 hover:underline">Clear</Link>
          <span className="text-xs text-gray-500">Showing {volunteers.length} of {approved.length}</span>
        </div>
      </form>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {volunteers.map((vol) => (
            <li key={vol.id} className="px-6 py-4 flex items-start justify-between hover:bg-gray-50 gap-4">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {vol.fullName}
                  <span className={`ml-2 align-middle px-2 py-0.5 text-xs rounded-full font-semibold ${statusBadge[vol.status] ?? statusBadge.active}`}>
                    {statusName[vol.status] ?? vol.status}
                  </span>
                </p>
                <p className="text-xs text-gray-500">{vol.email || "No email provided"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {vol.memberships.map((m) => (
                    <span key={m.id} className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-800">{m.team.name}</span>
                  ))}
                  {tagsOf(vol).map((t) => (
                    <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-700 border border-gray-200">#{t}</span>
                  ))}
                  {vol.qualifications.length > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      Trained for {vol.qualifications.length} role{vol.qualifications.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4 shrink-0">
                <span className="text-xs text-gray-400">{vol._count.assignments} assignments</span>
                <Link href={`/admin/volunteers/${vol.id}/edit`} className="text-brand-600 hover:text-brand-900 text-sm font-medium">
                  Edit
                </Link>
                <form action={deleteVolunteer}>
                  <input type="hidden" name="id" value={vol.id} />
                  <ConfirmButton
                    message={`Delete ${vol.fullName}? This also removes their ${vol._count.assignments} assignment(s). This can't be undone.`}
                    className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
          {volunteers.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-500">No volunteers match.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
