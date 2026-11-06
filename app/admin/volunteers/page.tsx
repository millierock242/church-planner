import { prisma } from "@/lib/prisma";
import { addVolunteer, deleteVolunteer } from "@/app/actions";
import ConfirmButton from "@/app/Components/ConfirmButton";
import Link from "next/link";

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const volunteers = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Volunteers</h1>
      </div>


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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {volunteers.map((vol) => (
            <li key={vol.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 gap-4">
              <div>
                <p className="text-sm font-bold text-gray-900">{vol.fullName}</p>
                <p className="text-xs text-gray-500">{vol.email || "No email provided"}</p>
              </div>
              <div className="flex items-center space-x-4">
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
            <li className="px-6 py-8 text-center text-sm text-gray-500">No volunteers found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
