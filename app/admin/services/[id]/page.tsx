import { assignVolunteerToService } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceAssignmentPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          user: true,
          role: { include: { team: true } },
        },
      },
    },
  });

  const volunteers = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
  const roles = await prisma.teamRole.findMany({ include: { team: true }, orderBy: { name: "asc" } });

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h1>
        <Link href="/admin/services" className="text-indigo-600 hover:underline text-sm font-medium">Return to Services</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
      
      {/* Service Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Service Management
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            href={`/admin/services/${event.id}/print`} 
            target="_blank"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
          >
            🖨️ Print / Export Roster
          </Link>
          <Link href="/admin/services" className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Back to Services
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Current Roster */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Current Roster ({event.assignments.length})</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {event.assignments.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 italic">No volunteers assigned to this service yet.</p>
            ) : (
              event.assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{assignment.user.fullName}</p>
                    <p className="text-xs text-gray-500">{assignment.role.team.name} • {assignment.role.name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    assignment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    assignment.status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assign Volunteer Form */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-md font-bold text-gray-900 mb-4">Assign Volunteer</h2>
            <form action={assignVolunteerToService} className="space-y-4">
              <input type="hidden" name="eventId" value={event.id} />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Select Volunteer</label>
                <select 
                  name="userId" 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Choose volunteer...</option>
                  {volunteers.map((vol) => (
                    <option key={vol.id} value={vol.id}>{vol.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ministry Role</label>
                <select 
                  name="roleId" 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Choose role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.team.name} - {role.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                Assign & Notify
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}