import { updateVolunteerStatus, deleteVolunteer } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminVolunteersPage() {
  const volunteers = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: {
      assignments: {
        include: { event: true },
      },
    },
  });

  type VolunteerWithApproval = (typeof volunteers)[number] & { isApproved: boolean };
  const approvalStatus = (volunteer: (typeof volunteers)[number]) =>
    (volunteer as VolunteerWithApproval).isApproved;

  const pendingVolunteers = volunteers.filter((v) => !approvalStatus(v));
  const approvedVolunteers = volunteers.filter(approvalStatus);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Admin Portal
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Volunteer Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review pending sign-ups and manage approved team members</p>
        </div>
        <Link href="/admin/services" className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          Back to Services
        </Link>
      </div>

      {/* Pending Approval Section */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>⏳ Pending Approvals</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{pendingVolunteers.length}</span>
        </h2>

        {pendingVolunteers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500 text-sm italic">
            No pending volunteer sign-ups at this time.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {pendingVolunteers.map((vol) => (
              <div key={vol.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{vol.fullName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📧 {vol.email || "No email provided"} • 📞 {vol.phoneNumber || "No phone provided"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Registered: {new Date(vol.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <form action={async () => { "use server"; await updateVolunteerStatus(vol.id, true); }}>
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer">
                      ✓ Approve
                    </button>
                  </form>
                  <form action={async () => { "use server"; await deleteVolunteer(vol.id); }}>
                    <button type="submit" className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg border border-red-200 transition cursor-pointer">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Volunteers Roster */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>✅ Approved Volunteers</span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{approvedVolunteers.length}</span>
        </h2>

        {approvedVolunteers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500 text-sm italic">
            No approved volunteers yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {approvedVolunteers.map((vol) => (
              <div key={vol.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{vol.fullName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📧 {vol.email || "No email"} • 📞 {vol.phoneNumber || "No phone"}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500 font-medium">
                    {vol.assignments.length} upcoming service commitments
                  </span>
                  <form action={async () => { "use server"; await updateVolunteerStatus(vol.id, false); }}>
                    <button type="submit" className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition cursor-pointer">
                      Revoke Approval
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}