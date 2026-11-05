import { createEvent } from "@/app/actions";
import Link from "next/link";

export default function NewServicePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule New Service</h1>
        <Link href="/admin/services" className="text-sm text-indigo-600 hover:text-indigo-900">
          ← Back to Services
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form 
          action={async (formData) => {
            "use server";
            await createEvent(formData);
          }} 
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Title</label>
            <input type="text" name="title" required placeholder="e.g. Sunday Morning Worship" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date & Time</label>
            <input type="datetime-local" name="eventDate" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
            <textarea name="description" rows={3} placeholder="Optional notes or rundown..." className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700">
            Create Service
          </button>
        </form>
      </div>
    </div>
  );
}