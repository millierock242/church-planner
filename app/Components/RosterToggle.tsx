"use client";

// "Open all" / "Close all" for the service dropdowns on the Roster page.
export default function RosterToggle() {
  const setAll = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-service]").forEach((d) => {
      d.open = open;
    });
  };
  const btn =
    "px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer";
  return (
    <div className="flex gap-2 print:hidden">
      <button type="button" onClick={() => setAll(true)} className={btn}>Open all</button>
      <button type="button" onClick={() => setAll(false)} className={btn}>Close all</button>
    </div>
  );
}
