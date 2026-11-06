import { loginAdmin, loginLeader } from "@/app/actions";
import { prisma } from "@/lib/prisma";

const field = "mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm";
const button = "w-full bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ministries = await prisma.team.findMany({
    where: { leaderPasswordHash: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Login</h1>
          {error === "1" && (
            <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3 text-center">
              Incorrect password. Please try again.
            </p>
          )}
          <form action={loginAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Password</label>
              <input type="password" name="password" required className={field} />
            </div>
            <button type="submit" className={button}>Sign In</button>
          </form>
        </div>

        {ministries.length > 0 && (
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-lg font-bold text-center text-gray-900 mb-4">Ministry Leader Login</h2>
            {error === "leader" && (
              <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3 text-center">
                Wrong ministry or password. Please try again.
              </p>
            )}
            <form action={loginLeader} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Ministry</label>
                <select name="teamId" required className={field}>
                  <option value="">Select ministry...</option>
                  {ministries.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ministry Password</label>
                <input type="password" name="password" required className={field} />
              </div>
              <button type="submit" className={button}>Sign In as Leader</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
