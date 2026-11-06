import Link from "next/link";
import { isAdmin } from "@/lib/session";
import { logoutAdmin } from "@/app/actions";

export default async function Navbar() {
  const admin = await isAdmin();

  return (
    <nav className="bg-white shadow-sm border-b-4 border-brand-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-between items-center gap-y-2 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="font-bold text-brand-600 text-lg">
            Christ Community Church’s Planner
          </Link>
          {admin && (
            <>
              <Link href="/admin/services" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Services
              </Link>
              <Link href="/admin/roster" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Roster
              </Link>
              <Link href="/admin/volunteers" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Volunteers
              </Link>
              <Link href="/admin/teams" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Ministries
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/portal" className="text-sm font-medium text-gray-700 hover:text-brand-600">
            Volunteer Portal
          </Link>
          {admin ? (
            <form action={logoutAdmin}>
              <button type="submit" className="text-sm font-medium bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer">
                Log Out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm font-medium bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200">
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
