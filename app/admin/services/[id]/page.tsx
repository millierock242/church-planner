import { prisma } from "@/lib/prisma";
import { createAssignment } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

interface AssignmentItem {
  id: string;
  status: string;
  user: {
    fullName: string;
  };
  role: {
    name: string;
    team: {
      name: string;
    };
  };
}

interface EventDetail {
  id: string;
  title: string;
  eventDate: Date;
  assignments: AssignmentItem[];
}

interface VolunteerItem {
  id: string;
  fullName: string;
}

interface RoleItem {
  id: string;
  name: string;
  team: {
    name: string;
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = (await prisma.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          user: true,
          role: { include: { team: true } },
        },
      },
    },
  })) as EventDetail | null;

  if (!event) notFound();

  const volunteers: VolunteerItem[] = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
  const roles: RoleItem[] = await prisma.teamRole.findMany({ include: { team: true }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link href={`/admin/services/${event.id}/print`} target="_blank" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
          Print / Export Roster
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Assign Volunteer</h2>
        <form 
          action={async (formData) => {
            "use server";
            await createAssignment(formData);
          }} 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Volunteer</label>
            <select name="userId" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm">
              <option value="">Select volunteer...</option>
              {volunteers.map((vol: VolunteerItem) => (
                <option key={vol.id} value={vol.id}>{vol.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select name="roleId" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm">
              <option value="">Select role...</option>
              {roles.map((role: RoleItem) => (
                <option key={role.id} value={role.id}>{role.team.name}: {role.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700">
            Assign
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Current Assignments</h2>
        <div className="space-y-3">
          {event.assignments.map((assignment: AssignmentItem) => (
            <div key={assignment.id} className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="font-medium text-gray-900">{assignment.user.fullName}</p>
                <p className="text-xs text-gray-500">{assignment.role.team.name} — {assignment.role.name}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-semibold capitalize ${
                assignment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                assignment.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {assignment.status}
              </span>
            </div>
          ))}
          {event.assignments.length === 0 && (
            <p className="text-sm text-gray-500">No volunteers assigned to this service yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}