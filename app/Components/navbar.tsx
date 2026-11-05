import Link from "next/link";
import { isAdmin } from "@/lib/session";
import { logoutAdmin } from "@/app/actions";

export default async function Navbar() {
  const admin = await isAdmin();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 flex justify-between h-16 items-center">
        <div className="flex space-x-8">
          <Link href="/" className="font-bold text-indigo-600 text-lg">
            Church Planner
          </Link>
          {admin && (
            <>
              <Link href="/admin/services" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                Services
              </Link>
              <Link href="/admin/roster" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                Roster
              </Link>
              <Link href="/admin/volunteers" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                Volunteers
              </Link>
              <Link href="/admin/teams" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                Teams
              </Link>
            </>
          )}
        </div>
        <div className="flex space-x-4 items-center">
          <Link href="/portal" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
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
