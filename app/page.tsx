import { prisma } from "@/lib/prisma";
import { signUpVolunteer } from "@/app/actions";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const { signup } = await searchParams;
  const upcomingEvents = await prisma.event.findMany({
    where: {
      eventDate: { gte: new Date() },
    },
    orderBy: { eventDate: "asc" },
    take: 5,
    include: {
      assignments: {
        include: {
          user: true,
          role: { include: { team: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Christ Community Church’s Planner</h1>
        <div className="space-x-4">
          <Link href="/admin/services" className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700">
            Manage Services
          </Link>
          <Link href="/admin/roster" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
            View Roster
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Services</h2>
        <div className="space-y-4">
          {upcomingEvents.map((event: { id: string; title: string; eventDate: Date }) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <Link href={`/admin/services/${event.id}`} className="text-brand-600 hover:text-brand-900 text-sm font-medium">
                View Details →
              </Link>
            </div>
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-gray-500 text-sm">No upcoming services scheduled.</p>
          )}
        </div>
      </div>

      <div id="signup" className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Volunteer Sign-Up</h2>
        <p className="text-sm text-gray-500 mb-4">Want to serve? Add your name and email and a ministry leader will be in touch.</p>

        {signup === "success" && (
          <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">
            Thank you for signing up! You&apos;ve been added to the volunteer list.
          </p>
        )}
        {signup === "exists" && (
          <p className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3">
            That email is already on the volunteer list. You&apos;re all set!
          </p>
        )}
        {(signup === "missing" || signup === "error") && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {signup === "missing" ? "Please enter your name and email." : "Something went wrong. Please try again."}
          </p>
        )}

        <form action={signUpVolunteer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="fullName" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          {/* Spam trap: hidden from people, bots fill it in */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" className="bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
            Sign Me Up
          </button>
        </form>
      </div>
    </div>
  );
}