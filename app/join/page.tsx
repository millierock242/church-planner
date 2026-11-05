import { createVolunteer } from "@/app/actions";
import Link from "next/link";

export default function PublicVolunteerSignupPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">🙌</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Join the Volunteer Team</h1>
          <p className="text-sm text-gray-500 mt-1">Fill out your information below to serve in upcoming church services</p>
        </div>

        <form action={createVolunteer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Full Name</label>
            <input 
              type="text" 
              name="fullName" 
              required 
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Phone Number (SMS Notifications)</label>
            <input 
              type="tel" 
              name="phone" 
              placeholder="(242) 555-0199"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
          >
            Submit Registration
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link href="/portal" className="text-xs font-semibold text-indigo-600 hover:underline">
            Already registered? View your schedule in the Volunteer Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}