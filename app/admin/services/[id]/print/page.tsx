import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PrintServicePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          user: true,
          role: {
            include: {
              team: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-0">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-gray-600">
          {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {event.description && <p className="mt-2 text-sm">{event.description}</p>}
      </div>

      <h2 className="text-xl font-semibold mb-4">Service Roster</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-left">Team / Role</th>
            <th className="border border-gray-300 p-2 text-left">Volunteer</th>
            <th className="border border-gray-300 p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {event.assignments.map((assignment: {
            id: string;
            role: { team: { name: string }; name: string };
            user: { fullName: string };
            status: string;
          }) => (
            <tr key={assignment.id}>
              <td className="border border-gray-300 p-2">
                <span className="font-semibold">{assignment.role.team.name}</span>: {assignment.role.name}
              </td>
              <td className="border border-gray-300 p-2">{assignment.user.fullName}</td>
              <td className="border border-gray-300 p-2 capitalize">{assignment.status}</td>
            </tr>
          ))}
          {event.assignments.length === 0 && (
            <tr>
              <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500">
                No assignments for this service.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}