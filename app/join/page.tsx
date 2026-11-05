import { signUpVolunteer } from "@/app/actions";
import Link from "next/link";

export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Volunteer Portal</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign up to get added to the team roster</p>
        <form 
          action={signUpVolunteer} 
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="fullName" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700">
            Register as Volunteer
          </button>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        </form>
        <div className="mt-4 text-center">
          <Link href="/portal" className="text-xs text-indigo-600 hover:text-indigo-900">
            Already registered? View My Assignments →
          </Link>
        </div>
      </div>
    </div>
  );
}