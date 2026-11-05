import { createEvent } from "../../../actions";
import Link from "next/link";

export default function NewServicePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule a New Church Service</h1>
        <p className="text-sm text-gray-500 mb-6">Create an upcoming service date and call time.</p>

        <form action={createEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Service Title</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="e.g. Sunday Morning Worship Experience" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Service Date & Time</label>
              <input 
                type="datetime-local" 
                name="eventDate" 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Crew Call Time</label>
              <input 
                type="datetime-local" 
                name="callTime" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Description / Notes</label>
            <textarea 
              name="description" 
              rows={3}
              placeholder="Special guest speaker, communion Sunday, etc." 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}