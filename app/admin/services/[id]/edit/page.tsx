import { prisma } from "@/lib/prisma";
import { updateEvent } from "@/app/actions";
import { toDateTimeLocal } from "@/lib/dates";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
        <Link href={`/admin/services/${id}`} className="text-sm text-brand-600 hover:text-brand-900">
          ← Back to Roster
        </Link>
      </div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          Couldn&apos;t save. Please check the fields and try again.
        </p>
      )}
      <div className="bg-white shadow rounded-lg p-6">
        <form action={updateEvent} className="space-y-4">
          <input type="hidden" name="id" value={event.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Title</label>
            <input type="text" name="title" required defaultValue={event.title} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date & Time</label>
            <input type="datetime-local" name="eventDate" required defaultValue={toDateTimeLocal(event.eventDate)} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
            <textarea name="description" rows={3} defaultValue={event.description ?? ""} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
