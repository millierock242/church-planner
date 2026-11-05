import { prisma } from "@/lib/prisma";
import { deleteVolunteer } from "@/app/actions";
import ConfirmButton from "@/app/Components/ConfirmButton";
import Link from "next/link";

export default async function AdminVolunteersPage() {
  const volunteers = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Volunteers</h1>
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
                <Link href={`/admin/volunteers/${vol.id}/edit`} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
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
