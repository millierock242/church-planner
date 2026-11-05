import { createTeam, createTeamRole } from "../../actions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function TeamManagementPage() {
  const teams = await prisma.team.findMany({
    include: { roles: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Teams & Roles Management</h1>
        <p className="text-sm text-gray-500 mt-1">Configure ministry departments and their respective serving positions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Teams List & Roles */}
        <div className="lg:col-span-2 space-y-6">
          {teams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <p className="text-sm text-gray-500 italic">No ministry teams created yet.</p>
            </div>
          ) : (
            teams.map((team) => (
              <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{team.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{team.description || "No description provided."}</p>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {team.roles.length} Roles
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Serving Roles</h3>
                  {team.roles.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No roles added to this team yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {team.roles.map((role) => (
                        <span key={role.id} className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200">
                          {role.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Forms Sidebar */}
        <div className="space-y-6">
          
          {/* Create Team Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-md font-bold text-gray-900 mb-4">Add Ministry Team</h2>
            <form action={createTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Team Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Hospitality Team" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Description</label>
                <textarea 
                  name="description" 
                  rows={2}
                  placeholder="Greeters, ushers, coffee station..." 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                Create Team
              </button>
            </form>
          </div>

          {/* Create Role Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-md font-bold text-gray-900 mb-4">Add Team Role</h2>
            <form action={createTeamRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Select Team</label>
                <select 
                  name="teamId" 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Choose department...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Role Title</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Lead Usher" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                Add Role
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}