import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function MasterRosterPage() {
  const assignments = await prisma.serviceAssignment.findMany({
    include: {
      event: true,
      user: true,
      role: {
        include: { team: true },
      },
    },
    orderBy: {
      event: { eventDate: "asc" },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Master Service Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Complete overview of all volunteer assignments across all services</p>
        </div>
        <Link 
          href="/" 
          className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 italic">No volunteer assignments found across any services yet.</p>
            <Link href="/admin/services" className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:underline">
              Go manage services and assign volunteers →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Service Date & Event</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Volunteer</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ministry / Role</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900">{assignment.event.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(assignment.event.eventDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{assignment.user.fullName}</p>
                      <p className="text-xs text-gray-400">{assignment.user.email || "No email"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {assignment.role.team.name}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{assignment.role.name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        assignment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'declined' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}