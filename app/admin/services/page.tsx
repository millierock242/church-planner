import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function AdminServicesPage() {
  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Church Services</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all scheduled services and rosters</p>
        </div>
        <Link 
          href="/admin/services/new" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition"
        >
          + Schedule New Service
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {events.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 italic text-center">No services scheduled yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {event._count.assignments} Assigned
                  </span>
                  <Link 
                    href={`/admin/services/${event.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100"
                  >
                    Manage Roster →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}