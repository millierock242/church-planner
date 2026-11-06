import { createEvent } from "@/app/actions";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";

export default async function NewServicePage() {
  await requireAdminPage();
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule New Service</h1>
        <Link href="/admin/services" className="text-sm text-brand-600 hover:text-brand-900">
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
            <label className="block text-sm font-medium text-gray-700">Repeat weekly for</label>
            <select name="repeatWeeks" defaultValue="1" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm">
              <option value="1">Just this one service</option>
              <option value="4">4 weeks</option>
              <option value="8">8 weeks</option>
              <option value="13">13 weeks (about 3 months)</option>
              <option value="26">26 weeks (about 6 months)</option>
              <option value="52">52 weeks (a full year)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Creates the same service on the same day and time each week.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
            <textarea name="description" rows={3} placeholder="Optional notes or rundown..." className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700">
            Create Service(s)
          </button>
        </form>
      </div>
    </div>
  );
}