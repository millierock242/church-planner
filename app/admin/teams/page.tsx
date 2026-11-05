import { prisma } from "@/lib/prisma";
import { createTeam, addRole } from "@/app/actions";

interface TeamWithRoles {
  id: string;
  name: string;
  description: string | null;
  roles: {
    id: string;
    name: string;
  }[];
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleStatus } = await searchParams;
  const teams: TeamWithRoles[] = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      roles: true,
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams & Roles</h1>

      {roleStatus === "ok" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Role added.</p>
      )}
      {roleStatus === "exists" && (
        <p className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3">That team already has a role with that name.</p>
      )}
      {(roleStatus === "missing" || roleStatus === "error") && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {roleStatus === "missing" ? "Please enter a role name." : "Couldn't add that role. Please try again."}
        </p>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
        <form 
          action={async (formData) => {
            "use server";
            await createTeam(formData);
          }} 
          className="space-y-4 max-w-xl"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Team Name</label>
            <input type="text" name="name" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
            Add Team
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {teams.map((team: TeamWithRoles) => (
          <div key={team.id} className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{team.description || "No description provided."}</p>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Roles:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {team.roles.map((role: { id: string; name: string }) => (
                  <li key={role.id}>{role.name}</li>
                ))}
                {team.roles.length === 0 && <li className="text-gray-400 italic">No roles added yet</li>}
              </ul>
            </div>
            <form action={addRole} className="mt-4 flex gap-2">
              <input type="hidden" name="teamId" value={team.id} />
              <input type="text" name="name" required placeholder="New role, e.g. Bass Guitar" className="flex-1 rounded-md border border-gray-300 p-2 text-sm shadow-sm" />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 cursor-pointer">
                Add Role
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}