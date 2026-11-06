// Formats a Date for <input type="datetime-local"> (e.g. 2026-11-08T10:00).
export function toDateTimeLocal(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Makes names comparable: "  milton   DEAN " and "Milton Dean" match.
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
