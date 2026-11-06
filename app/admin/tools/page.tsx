import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import { siteUrl } from "@/lib/notifications";
import Link from "next/link";

export default async function ToolsPage() {
  await requireAdminPage();
  const volunteers = await prisma.user.findMany({
    where: { isApproved: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, accessToken: true },
  });
  const base = siteUrl();

  const exportLink = "inline-block bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tools</h1>

      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Download your data (backup)</h2>
        <p className="text-sm text-gray-500 mb-4">Spreadsheet files (CSV) you can open in Excel, Numbers or Google Sheets. It’s a good idea to download these now and then.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/export/volunteers" className={exportLink}>Volunteers</Link>
          <Link href="/admin/export/assignments" className={exportLink}>All assignments</Link>
          <Link href="/admin/export/services" className={exportLink}>Services</Link>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Volunteer private links</h2>
        <p className="text-sm text-gray-500 mb-4">
          Each volunteer has a personal link (it is also in their assignment emails). They can confirm, ask for swaps, block out dates and add
          their schedule to their calendar there. Send a link only to that person.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
              <tr><th className="py-2 pr-4">Volunteer</th><th className="py-2">Link</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {volunteers.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">{v.fullName}</td>
                  <td className="py-2">
                    {v.accessToken ? (
                      <input readOnly value={`${base}/my/${v.accessToken}`} className="w-full min-w-72 rounded border border-gray-200 bg-gray-50 p-1.5 text-xs text-gray-700" />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No link yet — run the database upgrade script</span>
                    )}
                  </td>
                </tr>
              ))}
              {volunteers.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-gray-400 italic">No volunteers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Good to know</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>To change the admin password, edit <code>ADMIN_PASSWORD</code> in Railway (Variables) and let it redeploy.</li>
          <li>Ministry leader passwords are set on the Ministries page.</li>
          <li>Set <code>REQUIRE_PRIVATE_LINK</code> to <code>true</code> in Railway to turn off the name lookup so schedules only open with personal links.</li>
          <li>Set <code>ADMIN_NOTIFY_EMAIL</code> to get an email whenever someone asks for a swap.</li>
        </ul>
      </section>
    </div>
  );
}
