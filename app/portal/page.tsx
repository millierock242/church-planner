import { updateMyAssignmentStatus } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function VolunteerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email: rawEmail } = await searchParams;
  const email = rawEmail?.trim().toLowerCase() || "";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const assignments = email
    ? await prisma.serviceAssignment.findMany({
        where: { user: { email }, event: { eventDate: { gte: startOfToday } } },
        include: { event: true, user: true, role: { include: { team: true } } },
        orderBy: { event: { eventDate: "asc" } },
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 pt-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Volunteer Portal
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2">My Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email to see and confirm your upcoming assignments</p>
        </div>
        <Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          Home
        </Link>
      </div>

      <form method="get" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          required
          defaultValue={email}
          placeholder="you@example.com"
          className="flex-1 rounded-md border border-gray-300 p-2 shadow-sm"
        />
        <button type="submit" className="bg-indigo-600 text-white py-2 px-5 rounded-md text-sm font-medium hover:bg-indigo-700 cursor-pointer">
          Show My Schedule
        </button>
      </form>

      {email && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-sm text-gray-500 italic">
                No upcoming assignments found for that email. Check the spelling, or ask your team leader.
              </p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {assignment.role.team.name} • {assignment.role.name}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">{assignment.event.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📅 {new Date(assignment.event.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-1">
                    Volunteer: <span className="font-bold">{assignment.user.fullName}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {assignment.status === "confirmed" && (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg">✓ Confirmed</span>
                  )}
                  {assignment.status === "declined" && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-lg">✕ Declined</span>
                  )}
                  {assignment.status !== "confirmed" && (
                    <form action={async () => { "use server"; await updateMyAssignmentStatus(assignment.id, "confirmed", email); }}>
                      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer">
                        Confirm
                      </button>
                    </form>
                  )}
                  {assignment.status !== "declined" && (
                    <form action={async () => { "use server"; await updateMyAssignmentStatus(assignment.id, "declined", email); }}>
                      <button type="submit" className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3.5 py-2 rounded-lg border border-red-200 cursor-pointer">
                        Decline
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
