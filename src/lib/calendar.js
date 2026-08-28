import { toISO } from "./dates.js";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Sunday-first, matching the calendar apps people already use. */
export const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}`;

/** Clamps an arbitrary month index into a real year/month pair. */
export function normaliseMonth(year, month) {
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return { year: y, month: m };
}

export const shiftMonth = (year, month, by) => normaliseMonth(year, month + by);

/**
 * The full grid a month is drawn on: whole weeks, so it always starts on a
 * Sunday and ends on a Saturday, with the neighbouring days included and
 * marked. Returns rows of 7.
 */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  const weeks = [];
  const cursor = new Date(start);
  // Six rows covers every possible month layout; trim any trailing week that
  // belongs entirely to the next month.
  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      days.push({
        iso: toISO(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
    if (days.every((d) => !d.inMonth) && w > 3) {
      weeks.pop();
      break;
    }
  }
  return weeks;
}

/** "YYYY-MM-DD" -> "MM-DD", the shape an annual date is matched on. */
export const monthDayOf = (iso) => iso.slice(5);

/**
 * Which important days land in a given month.
 *
 * A day marked `annual` repeats on the same month-and-day every year, so
 * Independence Day is stored once rather than per year. Anything else only
 * shows in the year it was recorded for — lunar festivals move, so repeating
 * them annually would put them on the wrong date.
 */
export function daysInMonth(importantDays, year, month) {
  const prefix = monthKey(year, month);
  const mm = String(month + 1).padStart(2, "0");
  const byDate = new Map();

  for (const d of importantDays) {
    if (!d.date) continue;
    let iso = null;
    if (d.annual) {
      if (monthDayOf(d.date).startsWith(`${mm}-`)) iso = `${year}-${monthDayOf(d.date)}`;
    } else if (d.date.startsWith(prefix)) {
      iso = d.date;
    }
    if (!iso) continue;
    if (!byDate.has(iso)) byDate.set(iso, []);
    byDate.get(iso).push(d);
  }
  return byDate;
}
