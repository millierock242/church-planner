import { createVolunteer, toggleVolunteerApproval } from "../actions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function VolunteersPage() {
  const volunteers = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      isApproved: true,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Volunteer List */}
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Directory</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {volunteers.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 italic">No volunteers registered yet.</p>
              ) : (
                volunteers.map((vol) => (
                  <div key={vol.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{vol.fullName}</p>
                      <p className="text-xs text-gray-500">{vol.email || "No email"} • {vol.phoneNumber || "No phone"}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        vol.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vol.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>

                      <form action={async () => {
                        "use server";
                        await toggleVolunteerApproval(vol.id, vol.isApproved);
                      }}>
                        <button 
                          type="submit"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
                        >
                          {vol.isApproved ? 'Revoke' : 'Approve'}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Volunteer Form */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Register New Volunteer</h2>
            <form action={createVolunteer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="fullName" 
                  required 
                  placeholder="Jane Doe" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="jane@example.com" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  name="phone" 
                  placeholder="555-0192" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                Submit for Approval
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}