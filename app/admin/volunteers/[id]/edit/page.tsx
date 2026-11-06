import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateVolunteer } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

const field = "mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm";

export default async function EditVolunteerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; new?: string; approved?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { error, new: isNew, approved } = await searchParams;

  const volunteer = await prisma.user.findUnique({
    where: { id },
    include: { memberships: true, qualifications: true },
  });
  if (!volunteer) notFound();

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, include: { roles: { orderBy: { name: "asc" } } } });
  const everyone = await prisma.user.findMany({ select: { tags: true } });
  const existingTags = Array.from(
    new Set(everyone.flatMap((u) => (u.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean)))
  ).sort();

  const memberOf = new Set(volunteer.memberships.map((m) => m.teamId));
  const trainedFor = new Set(volunteer.qualifications.map((q) => q.roleId));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Volunteer</h1>
        <Link href="/admin/volunteers" className="text-sm text-brand-600 hover:text-brand-900">
          ← Back to Volunteers
        </Link>
      </div>
      {(isNew || approved) && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">
          {approved ? "Approved! " : "Volunteer added! "}
          Choose their ministries, trained roles and labels below, then save.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          Couldn&apos;t save. Is that email already used by another volunteer?
        </p>
      )}

      <form action={updateVolunteer} className="space-y-6">
        <input type="hidden" name="id" value={volunteer.id} />

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basics</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="fullName" required defaultValue={volunteer.fullName} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" defaultValue={volunteer.email ?? ""} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" defaultValue={volunteer.status} className={field}>
              <option value="active">Active — can be scheduled</option>
              <option value="on_break">On a break — hidden from scheduling</option>
              <option value="inactive">Inactive — hidden from scheduling</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Ministries</h2>
          <p className="text-xs text-gray-500 mb-3">Which ministries does this person belong to?</p>
          {teams.length === 0 && <p className="text-sm text-gray-400 italic">No ministries yet.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" name="teamIds" value={t.id} defaultChecked={memberOf.has(t.id)} className="h-4 w-4 rounded border-gray-300" />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Trained for these roles</h2>
          <p className="text-xs text-gray-500 mb-3">When you schedule someone for a role, people trained for it are listed first.</p>
          <div className="space-y-4">
            {teams.map((t) => (
              <fieldset key={t.id}>
                <legend className="text-sm font-semibold text-gray-700 mb-1">{t.name}</legend>
                {t.roles.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No roles yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {t.roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="checkbox" name="roleIds" value={r.id} defaultChecked={trainedFor.has(r.id)} className="h-4 w-4 rounded border-gray-300" />
                        {r.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Labels</h2>
          <p className="text-xs text-gray-500 mb-3">
            Your own groupings, separated by commas. For example: Youth, Musician, Bilingual, New Member.
          </p>
          <input type="text" name="tags" list="existing-tags" defaultValue={volunteer.tags ?? ""} placeholder="Youth, Musician" className={field} />
          <datalist id="existing-tags">
            {existingTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {existingTags.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">Labels already in use: {existingTags.join(", ")}</p>
          )}
        </div>

        <button type="submit" className="w-full bg-brand-600 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
          Save Changes
        </button>
      </form>
    </div>
  );
}
