import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { logoutAdmin } from "@/app/actions";
import { prisma } from "@/lib/prisma";

const link = "text-sm font-medium text-gray-700 hover:text-brand-600";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold h-5 min-w-5 px-1.5">
      {n}
    </span>
  );
}

export default async function Navbar() {
  const access = await getAccess();
  let pendingApprovals = 0;
  let swapRequests = 0;
  if (access.isStaff) {
    pendingApprovals = access.isAdmin ? await prisma.user.count({ where: { isApproved: false } }) : 0;
    swapRequests = await prisma.serviceAssignment.count({
      where: {
        status: "swap_requested",
        ...(access.isAdmin ? {} : { role: { teamId: access.leaderTeamId ?? "" } }),
      },
    });
  }

  return (
    <nav className="bg-white shadow-sm border-b-4 border-brand-500 print:hidden">
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-between items-center gap-y-2 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="font-bold text-brand-600 text-lg">
            Christ Community Church’s Planner
          </Link>
          {access.isStaff && (
            <>
              <Link href="/admin/todo" className={link}>
                To-Do<Badge n={swapRequests} />
              </Link>
              <Link href="/admin/services" className={link}>Services</Link>
              <Link href="/admin/calendar" className={link}>Calendar</Link>
              <Link href="/admin/roster" className={link}>Roster</Link>
              {access.isAdmin && (
                <>
                  <Link href="/admin/volunteers" className={link}>
                    Volunteers<Badge n={pendingApprovals} />
                  </Link>
                  <Link href="/admin/teams" className={link}>Ministries</Link>
                  <Link href="/admin/reports" className={link}>Reports</Link>
                  <Link href="/admin/tools" className={link}>Tools</Link>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/#signup" className={link}>Volunteer Sign-Up</Link>
          {access.isStaff ? (
            <form action={logoutAdmin}>
              <button type="submit" className="text-sm font-medium bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer">
                Log Out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm font-medium bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200">
              Admin / Leader Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
