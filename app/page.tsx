import { PrismaClient } from "@prisma/client";
import { updateAssignmentStatus } from "./actions";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function Home() {
  const events = await prisma.event.findMany({
    where: {
      eventDate: { gte: new Date() },
    },
    include: {
      assignments: {
        include: {
          user: true,
          role: {
            include: { team: true },
          },
        },
      },
    },
    orderBy: { eventDate: "asc" },
    take: 5,
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Church Volunteer Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming service rosters and team assignments</p>
        </div>
        <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
          Database Connected (SQLite)
        </span>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-2">No upcoming services scheduled yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            Click `+ New Service` above or use Prisma Studio (`npx prisma studio`) to add sample events.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <Link href={`/admin/services/${event.id}`} className="hover:underline">
                    <h2 className="text-lg font-bold text-gray-900">{event.title} ↗</h2>
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Service Date: {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {event.assignments.length} Assigned
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Assigned Roster</h3>
                {event.assignments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No volunteers assigned to this service yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex flex-col justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                        <div className="flex justify-between items-start">
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

                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-2 border-t border-gray-200">
                          <form action={async () => {
                            "use server";
                            await updateAssignmentStatus(assignment.id, "confirmed");
                          }} className="flex-1">
                            <button
                              type="submit"
                              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded shadow-sm transition cursor-pointer"
                            >
                              Confirm
                            </button>
                          </form>

                          <form action={async () => {
                            "use server";
                            await updateAssignmentStatus(assignment.id, "declined");
                          }} className="flex-1">
                            <button
                              type="submit"
                              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded shadow-sm transition cursor-pointer"
                            >
                              Decline
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}