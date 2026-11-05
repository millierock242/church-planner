import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HomePage() {
  const upcomingEvents = await prisma.event.findMany({
    where: {
      eventDate: { gte: new Date() },
    },
    orderBy: { eventDate: "asc" },
    take: 5,
    include: {
      assignments: {
        include: {
          user: true,
          role: { include: { team: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Church Planner Dashboard</h1>
        <div className="space-x-4">
          <Link href="/admin/services" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
            Manage Services
          </Link>
          <Link href="/admin/roster" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
            View Roster
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Services</h2>
        <div className="space-y-4">
          {upcomingEvents.map((event: { id: string; title: string; eventDate: Date }) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <Link href={`/admin/services/${event.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                View Details →
              </Link>
            </div>
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-gray-500 text-sm">No upcoming services scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}