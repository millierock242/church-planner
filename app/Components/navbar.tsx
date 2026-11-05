import Link from "next/link";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { logoutAdmin } from "@/app/actions";

export default async function Navbar() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const isAdmin = session.isAdmin ?? false;

  return (
    <nav className="bg-white border-b border-gray-200 mb-8 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-xl font-extrabold text-indigo-600 tracking-tight flex items-center gap-2">
              <span>⛪</span> Church Planner
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Public Volunteer Links */}
            <Link 
              href="/join" 
              className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Sign Up to Serve
            </Link>

            <Link 
              href="/portal" 
              className="text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3.5 py-2 rounded-lg transition"
            >
              My Schedule 👤
            </Link>

            {/* Admin-Only Links */}
            {isAdmin ? (
              <>
                <div className="h-4 w-px bg-gray-300 mx-1" />
                <Link 
                  href="/admin/services" 
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-indigo-600 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Services
                </Link>
                <Link 
                  href="/admin/roster" 
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-indigo-600 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Master Roster
                </Link>
                <Link 
                  href="/admin/teams" 
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-indigo-600 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Teams
                </Link>
                <form action={logoutAdmin}>
                  <button type="submit" className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition cursor-pointer">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link 
                href="/login" 
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                Admin Login 🔒
              </Link>
            )}

          </div>

        </div>
      </div>
    </nav>
  );
}<Link 
  href="/admin/volunteers" 
  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-indigo-600 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
>
  Volunteers
</Link>