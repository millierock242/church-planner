import { updateMyAssignmentStatus, requestSwapByName } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/dates";

function findAssignments(userIds: string[], from: Date) {
  return prisma.serviceAssignment.findMany({
    where: { userId: { in: userIds }, event: { eventDate: { gte: from } } },
    include: { event: true, user: true, role: { include: { team: true } } },
    orderBy: { event: { eventDate: "asc" } },
  });
}

// The name lookup: used on the home page.
export default async function PortalSection({ name }: { name: string }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const requireLink = process.env.REQUIRE_PRIVATE_LINK === "true";
  let assignments: Awaited<ReturnType<typeof findAssignments>> = [];
  if (name && !requireLink) {
    // Exact full-name match, ignoring capital letters and extra spaces.
    const everyone = await prisma.user.findMany({ select: { id: true, fullName: true } });
    const ids = everyone.filter((u) => normalizeName(u.fullName) === normalizeName(name)).map((u) => u.id);
    if (ids.length) assignments = await findAssignments(ids, startOfToday);
  }

  return (
    <section id="my-schedule" className="mb-10">
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
          Volunteer Portal
        </span>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-2">My Schedule</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your full name to see and confirm your upcoming assignments</p>
      </div>

      <form method="get" action="/#my-schedule" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="name"
          required
          defaultValue={name}
          placeholder="Your full name, e.g. Jane Smith"
          className="flex-1 rounded-md border border-gray-300 p-2 shadow-sm"
        />
        <button type="submit" className="bg-brand-600 text-white py-2 px-5 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
          Show My Schedule
        </button>
      </form>

      {requireLink && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mb-6">
          <p className="text-sm text-gray-700">
            For privacy, schedules are now opened with your <strong>personal link</strong>. Check the email you received when you were scheduled,
            or ask your ministry leader to send it again.
          </p>
        </div>
      )}

      {name && !requireLink && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-sm text-gray-500 italic">
                No upcoming assignments found for that name. Check the spelling (use the name you signed up with), or ask your ministry leader.
              </p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md">
                    {assignment.role.team.name} • {assignment.role.name}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">{assignment.event.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📅 {new Date(assignment.event.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-1">
                    Volunteer: <span className="font-bold">{assignment.user.fullName}</span>
                  </p>
                  {assignment.status === "swap_requested" ? (
                    <p className="text-xs text-orange-700 mt-2">Replacement requested — a leader will follow up.</p>
                  ) : (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Can&apos;t make it? Ask for a replacement</summary>
                      <form action={requestSwapByName} className="mt-2 flex gap-2">
                        <input type="hidden" name="name" value={name} />
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input type="text" name="note" placeholder="Optional note (e.g. out of town)" className="flex-1 rounded-md border border-gray-300 p-1.5 text-xs" />
                        <button type="submit" className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-orange-600 cursor-pointer">
                          Ask for swap
                        </button>
                      </form>
                    </details>
                  )}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {assignment.status === "confirmed" && (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg">✓ Confirmed</span>
                  )}
                  {assignment.status === "declined" && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-lg">✕ Declined</span>
                  )}
                  {assignment.status !== "confirmed" && (
                    <form action={async () => { "use server"; await updateMyAssignmentStatus(assignment.id, "confirmed", name); }}>
                      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer">
                        Confirm
                      </button>
                    </form>
                  )}
                  {assignment.status !== "declined" && (
                    <form action={async () => { "use server"; await updateMyAssignmentStatus(assignment.id, "declined", name); }}>
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
    </section>
  );
}
