import { prisma } from "@/lib/prisma";

export default async function AdminVolunteersPage() {
  const volunteers = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: {
      assignments: {
        include: {
          event: true,
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Volunteers</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {volunteers.map((vol: (typeof volunteers)[number]) => (
            <li key={vol.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="text-sm font-bold text-gray-900">{vol.fullName}</p>
                <p className="text-xs text-gray-500">{vol.email || "No email provided"}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                  {vol.role}
                </span>
                <span className="text-xs text-gray-400">
                  {vol.assignments.length} assignments
                </span>
              </div>
            </li>
          ))}
          {volunteers.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-500">
              No volunteers found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}