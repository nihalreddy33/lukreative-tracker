// Date-only helpers. Due dates are stored as "YYYY-MM-DD" strings so they never
// shift across timezones — a task due the 24th is due the 24th everywhere.

/**
 * The agency works to Indian time, and this decides what "due today" and
 * "overdue" mean. Reading the host clock instead would put the rollover at
 * 05:30 IST on Vercel, which runs UTC — so between midnight and half five in
 * the morning the app would still believe it was yesterday.
 *
 * Fixing it to a zone also keeps server and browser in agreement, whatever
 * timezone the laptop is set to.
 */
export const AGENCY_TIMEZONE = "Asia/Kolkata";

export function today(timeZone = AGENCY_TIMEZONE) {
  // en-CA formats as YYYY-MM-DD, which is the shape used throughout.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Wall-clock time in the agency's zone, for "updated at" labels. */
export function nowTime(timeZone = AGENCY_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
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
