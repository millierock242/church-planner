import { prisma } from "@/lib/prisma";
import { setStatusByToken, requestSwapByToken, addBlockoutByToken, removeBlockoutByToken } from "@/app/actions";
import { startOfDay } from "@/lib/conflicts";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const statusStyle: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  swap_requested: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
};
const statusText: Record<string, string> = {
  confirmed: "✓ Confirmed",
  declined: "✕ Declined",
  swap_requested: "Replacement requested",
  pending: "Waiting for your reply",
};

export default async function MySchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { accessToken: token } });
  if (!user) notFound();

  const today = startOfDay(new Date());
  const assignments = await prisma.serviceAssignment.findMany({
    where: { userId: user.id, event: { eventDate: { gte: today } } },
    include: { event: true, role: { include: { team: true } } },
    orderBy: { event: { eventDate: "asc" } },
  });
  const blockouts = await prisma.blockoutDate.findMany({
    where: { userId: user.id, date: { gte: today } },
    orderBy: { date: "asc" },
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const feed = `${host}/api/calendar/${token}.ics`;
  const webcal = `webcal://${feed}`;
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
        Your private schedule
      </span>
      <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Hi, {user.fullName.split(" ")[0]}!</h1>
      <p className="text-sm text-gray-500 mt-1">Please keep this link to yourself. Anyone who has it can see and change your schedule.</p>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Upcoming assignments</h2>
        {assignments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500 italic">
            You aren&apos;t scheduled for anything yet. Thank you for being ready to serve!
          </div>
        )}
        {assignments.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md">
                  {a.role.team.name} • {a.role.name}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">{a.event.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  📅 {new Date(a.event.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <span className={`self-start text-xs font-bold px-3 py-1.5 rounded-lg ${statusStyle[a.status] ?? statusStyle.pending}`}>
                {statusText[a.status] ?? a.status}
              </span>
            </div>

            {a.status !== "swap_requested" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {a.status !== "confirmed" && (
                  <form action={setStatusByToken}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <input type="hidden" name="status" value="confirmed" />
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer">Confirm</button>
                  </form>
                )}
                {a.status !== "declined" && (
                  <form action={setStatusByToken}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <input type="hidden" name="status" value="declined" />
                    <button type="submit" className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3.5 py-2 rounded-lg border border-red-200 cursor-pointer">Decline</button>
                  </form>
                )}
                <details className="w-full sm:w-auto">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 px-2 py-2">Ask for a replacement</summary>
                  <form action={requestSwapByToken} className="mt-2 flex gap-2">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <input type="text" name="note" placeholder="Optional note (e.g. out of town)" className="flex-1 rounded-md border border-gray-300 p-1.5 text-xs" />
                    <button type="submit" className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-orange-600 cursor-pointer">Ask for swap</button>
                  </form>
                </details>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-10 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Add everything to my calendar</h2>
        <p className="text-sm text-gray-500 mt-1 mb-3">
          Subscribe once and every service you&apos;re scheduled for shows up in your calendar and stays up to date.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={google} target="_blank" rel="noopener noreferrer" className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-700">
            Google Calendar
          </a>
          <a href={webcal} className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">
            Apple / Outlook Calendar
          </a>
        </div>
      </section>

      <section className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Days I&apos;m unavailable</h2>
        <p className="text-sm text-gray-500 mt-1 mb-3">Leaders are warned before scheduling you on these days.</p>
        <form action={addBlockoutByToken} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input type="hidden" name="token" value={token} />
          <input type="date" name="date" required className="rounded-md border border-gray-300 p-2 text-sm" />
          <input type="text" name="note" placeholder="Reason (optional)" className="flex-1 rounded-md border border-gray-300 p-2 text-sm" />
          <button type="submit" className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-700 cursor-pointer">Add day</button>
        </form>
        {blockouts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No days marked.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {blockouts.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-gray-800">
                  {new Date(b.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  {b.note ? <span className="text-gray-500"> — {b.note}</span> : null}
                </span>
                <form action={removeBlockoutByToken}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="text-red-600 hover:text-red-800 text-xs font-medium cursor-pointer">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
