import { addDays, toISO } from "./dates.js";

export const FREQUENCIES = ["Daily", "Weekly", "Monthly"];

export const WEEKDAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

/** Day of week for a "YYYY-MM-DD" string. 0 = Sunday. */
export function weekdayOf(iso) {
  return new Date(`${iso}T00:00:00`).getDay();
}

export const parseWeekdays = (csv) =>
  String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "") // Number("") is 0, which would read as Sunday
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

/** Whole days between two dates, ignoring time. */
function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86400000);
}

/** Monday of the week containing `iso`, so weekly intervals have a stable anchor. */
function weekStart(iso) {
  const d = weekdayOf(iso);
  return addDays(iso, d === 0 ? -6 : 1 - d); // ISO weeks start Monday
}

/**
 * The `wanted` day of the month `offset` months after `iso`'s month, clamped to
 * the month's length. The wanted day is passed in rather than read back off the
 * result, so "the 31st" clamping to the 28th in February doesn't drag every
 * later month down to the 28th too.
 */
function monthDate(year, monthIndex, wanted) {
  const target = new Date(Date.UTC(year, monthIndex, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const p = (x) => String(x).padStart(2, "0");
  return `${y}-${p(m + 1)}-${p(Math.min(wanted, lastDay))}`;
}

/**
 * Every date a rule falls on within [from, to], inclusive.
 *
 * `rule` is { frequency, weekdays, monthDay, interval, startDate, endDate }.
 * Pure and date-only, so it can be checked without a database or a clock.
 */
export function occurrencesBetween(rule, from, to) {
  const out = [];
  if (!from || !to || from > to) return out;

  const interval = Math.max(1, Number(rule.interval) || 1);
  const start = rule.startDate || from;
  const end = rule.endDate || null;

  const begin = start > from ? start : from;
  const finish = end && end < to ? end : to;
  if (begin > finish) return out;

  if (rule.frequency === "Daily") {
    // Anchored on startDate so "every 3 days" doesn't drift with the window.
    for (let d = begin; d <= finish; d = addDays(d, 1)) {
      if (daysBetween(start, d) % interval === 0) out.push(d);
    }
    return out;
  }

  if (rule.frequency === "Weekly") {
    const days = new Set(parseWeekdays(rule.weekdays));
    if (!days.size) return out;
    const anchor = weekStart(start);
    for (let d = begin; d <= finish; d = addDays(d, 1)) {
      if (!days.has(weekdayOf(d))) continue;
      const weeks = Math.floor(daysBetween(anchor, weekStart(d)) / 7);
      if (weeks % interval === 0) out.push(d);
    }
    return out;
  }

  if (rule.frequency === "Monthly") {
    const wanted = Math.min(31, Math.max(1, Number(rule.monthDay) || Number(start.slice(8, 10))));
    // Walk whole months from the start, rather than scanning every day.
    const startYear = Number(start.slice(0, 4));
    const startMonth = Number(start.slice(5, 7)) - 1;
    let step = monthDate(startYear, startMonth, wanted) < start ? interval : 0;
    for (let guard = 0; guard < 600; guard += 1, step += interval) {
      const date = monthDate(startYear, startMonth + step, wanted);
      if (date > finish) break;
      if (date >= begin) out.push(date);
    }
    return out;
  }

  return out;
}

/** The first date on or after `from` that the rule falls on. */
export function nextOccurrence(rule, from, horizonDays = 400) {
  const [first] = occurrencesBetween(rule, from, addDays(from, horizonDays));
  return first ?? null;
}

/** "Every Monday", "Every 2 weeks on Mon, Thu", "Monthly on the 15th". */
export function describeRule(rule) {
  const interval = Math.max(1, Number(rule.interval) || 1);

  if (rule.frequency === "Daily") {
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }
  if (rule.frequency === "Weekly") {
    const names = parseWeekdays(rule.weekdays)
      .map((n) => WEEKDAYS.find((w) => w.value === n))
      .filter(Boolean);
    const list = names.length === 1 ? names[0].long : names.map((w) => w.short).join(", ");
    if (!names.length) return "Weekly";
    return interval === 1 ? `Every ${list}` : `Every ${interval} weeks on ${list}`;
  }
  if (rule.frequency === "Monthly") {
    const day = Number(rule.monthDay) || 1;
    const suffix =
      day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
    return interval === 1
      ? `Monthly on the ${day}${suffix}`
      : `Every ${interval} months on the ${day}${suffix}`;
  }
  return "Repeats";
}
