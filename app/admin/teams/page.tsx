import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeam, addRole, renameRole, setLeaderPassword, toggleRoleRequired } from "@/app/actions";

interface TeamWithRoles {
  id: string;
  name: string;
  description: string | null;
  leaderPasswordHash: string | null;
  _count: { members: number };
  roles: {
    id: string;
    name: string;
    requiredByDefault: boolean;
  }[];
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; leader?: string }>;
}) {
  await requireAdminPage();
  const { role: roleStatus, leader: leaderStatus } = await searchParams;
  const teams: TeamWithRoles[] = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      roles: true,
      _count: { select: { members: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ministries & Roles</h1>

      {leaderStatus === "saved" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Ministry leader password saved.</p>
      )}
      {leaderStatus === "cleared" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Ministry leader login turned off.</p>
      )}
      {leaderStatus === "short" && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">Leader passwords need at least 6 characters.</p>
      )}
      {roleStatus === "renamed" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Role renamed. Past assignments keep working under the new name.</p>
      )}
      {roleStatus === "ok" && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3">Role added.</p>
      )}
      {roleStatus === "exists" && (
        <p className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3">That ministry already has a role with that name.</p>
      )}
      {(roleStatus === "missing" || roleStatus === "error") && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {roleStatus === "missing" ? "Please enter a role name." : "Couldn't save that role. Please try again."}
        </p>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New Ministry</h2>
        <form 
          action={async (formData) => {
            "use server";
            await createTeam(formData);
          }} 
          className="space-y-4 max-w-xl"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Ministry Name</label>
            <input type="text" name="name" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700">
            Add Ministry
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {teams.map((team: TeamWithRoles) => (
          <div key={team.id} className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{team.description || "No description provided."}</p>
            <p className="text-xs text-brand-700 mt-1">{team._count.members} member{team._count.members === 1 ? "" : "s"}</p>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Roles:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {team.roles.map((role: { id: string; name: string; requiredByDefault: boolean }) => (
                  <li key={role.id}>
                    <div className="flex items-center justify-between gap-2">
                    <span>{role.name}</span>
                    <form action={toggleRoleRequired}>
                      <input type="hidden" name="roleId" value={role.id} />
                      <button
                        type="submit"
                        title="Roles marked 'needed' show up on your To-Do list when nobody is assigned"
                        className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer ${
                          role.requiredByDefault
                            ? "bg-brand-100 text-brand-800 border-brand-300"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {role.requiredByDefault ? "✓ Needed every service" : "Optional"}
                      </button>
                    </form>
                    </div>
                    <details className="mt-1">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Rename</summary>
                      <form action={renameRole} className="mt-1 flex gap-2">
                        <input type="hidden" name="roleId" value={role.id} />
                        <input type="text" name="name" required defaultValue={role.name} className="flex-1 rounded-md border border-gray-300 p-1.5 text-sm shadow-sm" />
                        <button type="submit" className="bg-gray-800 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-700 cursor-pointer">
                          Save
                        </button>
                      </form>
                    </details>
                  </li>
                ))}
                {team.roles.length === 0 && <li className="text-gray-400 italic">No roles added yet</li>}
              </ul>
            </div>
            <form action={addRole} className="mt-4 flex gap-2">
              <input type="hidden" name="teamId" value={team.id} />
              <input type="text" name="name" required placeholder="New role, e.g. Bass Guitar" className="flex-1 rounded-md border border-gray-300 p-2 text-sm shadow-sm" />
              <button type="submit" className="bg-brand-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
                Add Role
              </button>
            </form>

            <form action={setLeaderPassword} className="mt-4 pt-4 border-t border-gray-100">
              <input type="hidden" name="teamId" value={team.id} />
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ministry leader login {team.leaderPasswordHash ? "(on)" : "(off)"}
              </label>
              <div className="flex gap-2">
                <input type="text" name="password" placeholder={team.leaderPasswordHash ? "New password (blank = turn off)" : "Set a password to turn on"} className="flex-1 rounded-md border border-gray-300 p-2 text-sm shadow-sm" />
                <button type="submit" className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 cursor-pointer">
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leaders can schedule people in this ministry only.</p>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}