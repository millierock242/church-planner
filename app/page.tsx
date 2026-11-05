import Link from "next/link";
import { prisma } from "../lib/prisma";

type ServiceWithAssignments = {
  id: string | number;
  title: string | null;
  date: Date | string | null;
  status: string | null;
  assignments: Array<{
    person: {
      id: string | number;
      name?: string | null;
      email?: string | null;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  }>;
};

// Helper to calculate status badge colors safely with expected arguments
function getStatusBadge(
  status: string | null | undefined,
  defaultStyle: string,
  fallbackText: string
) {
  if (!status) return { text: fallbackText, className: defaultStyle };

  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return { text: "Confirmed", className: "bg-green-100 text-green-800" };
    case "PENDING":
      return { text: "Pending", className: "bg-yellow-100 text-yellow-800" };
    case "DECLINED":
      return { text: "Declined", className: "bg-red-100 text-red-800" };
    default:
      return { text: status, className: defaultStyle };
  }
}

export default async function HomePage() {
  // Fetch upcoming services and team assignments from Prisma
  let upcomingServices: ServiceWithAssignments[] = [];

  try {
    upcomingServices = await prisma.service.findMany({
      take: 5,
      orderBy: { date: "asc" },
      include: {
        assignments: {
          include: {
            person: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to load services:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
              CP
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Church Planner
            </h1>
          </div>
          <nav className="flex space-x-4">
            <Link
              href="/admin/services"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Manage Services
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600">
            Overview of upcoming services and volunteer team scheduling.
          </p>
        </div>

        {/* Services Overview List */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50 px-6 py-4">
            <h3 className="font-semibold text-gray-800">Upcoming Services</h3>
          </div>

          {upcomingServices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-base">No upcoming services scheduled.</p>
              <Link
                href="/admin/services"
                className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                + Create your first service
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {upcomingServices.map((service, index: number) => {
                const badge = getStatusBadge(
                  service.status ?? "PENDING",
                  "bg-gray-100 text-gray-800",
                  "Scheduled"
                );

                return (
                  <div
                    key={service.id || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-lg text-gray-900">
                          {service.title || "Sunday Worship Service"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {service.date
                          ? new Date(service.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Date TBD"}
                      </p>
                    </div>

                    <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                      <span className="text-xs text-gray-500">
                        {service.assignments?.length || 0} Volunteers Scheduled
                      </span>
                      <Link
                        href={`/admin/services/${service.id}`}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        View Plan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}