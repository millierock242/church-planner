import { prisma } from "@/lib/prisma";
import { deleteEvent } from "@/app/actions";
import ConfirmButton from "@/app/Components/ConfirmButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services & Rosters</h1>
        <Link
          href="/admin/services/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          Schedule New Service
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {events.map((event) => (
            <li key={event.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(event.eventDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {event._count.assignments} assigned
                </span>
                <Link
                  href={`/admin/services/${event.id}`}
                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  Manage Roster →
                </Link>
                <Link
                  href={`/admin/services/${event.id}/edit`}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Edit
                </Link>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={event.id} />
                  <ConfirmButton
                    message={`Delete "${event.title}"? This also removes its ${event._count.assignments} assignment(s). This can't be undone.`}
                    className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-500">
              No services scheduled yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
