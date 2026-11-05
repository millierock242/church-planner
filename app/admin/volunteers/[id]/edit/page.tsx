import { prisma } from "@/lib/prisma";
import { updateVolunteer } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditVolunteerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const volunteer = await prisma.user.findUnique({ where: { id } });
  if (!volunteer) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Volunteer</h1>
        <Link href="/admin/volunteers" className="text-sm text-indigo-600 hover:text-indigo-900">
          ← Back to Volunteers
        </Link>
      </div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          Couldn&apos;t save. Is that email already used by another volunteer?
        </p>
      )}
      <div className="bg-white shadow rounded-lg p-6">
        <form action={updateVolunteer} className="space-y-4">
          <input type="hidden" name="id" value={volunteer.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="fullName" required defaultValue={volunteer.fullName} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" defaultValue={volunteer.email ?? ""} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 cursor-pointer">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
