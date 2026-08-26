// Date-only helpers. Due dates are stored as "YYYY-MM-DD" strings so they never
// shift across timezones — a task due the 24th is due the 24th everywhere.

export function today() {
  const d = new Date();
  return toISO(d);
}

export function toISO(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days from `iso` to today. Positive = in the past. */
export function daysAgo(iso, from = today()) {
  if (!iso) return null;
  const ms = Date.parse(`${from}T00:00:00`) - Date.parse(`${iso}T00:00:00`);
  return Math.round(ms / 86400000);
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function isOverdue(task, from = today()) {
  return (
    task.status !== "Completed" && !!task.dueDate && task.dueDate < from
  );
}

export function isDueSoon(task, days = 7, from = today()) {
  if (task.status === "Completed" || !task.dueDate) return false;
  return task.dueDate >= from && task.dueDate <= addDays(from, days);
}

/** "24 Aug 2026", or "—" when unset. */
export function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Excel serial date (1899-12-30 epoch) -> "YYYY-MM-DD". */
export function fromExcelSerial(serial) {
  const n = Number(serial);
  if (!n || Number.isNaN(n)) return "";
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
