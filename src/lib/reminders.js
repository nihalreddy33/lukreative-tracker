import { today, addDays, daysAgo, isOverdue } from "./dates.js";

/** "24 Aug" — short enough for a chat message. */
export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function headerDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Splits one person's open tasks into the buckets a daily nudge cares about.
 * Every open task lands in exactly one bucket, so nothing is silently dropped.
 */
export function bucket(tasks, { from = today(), days = 7 } = {}) {
  const open = tasks.filter((t) => t.status !== "Completed");
  const horizon = addDays(from, days);

  const overdue = [];
  const dueToday = [];
  const soon = [];
  const later = [];
  const undated = [];

  for (const t of open) {
    if (!t.dueDate) undated.push(t);
    else if (t.dueDate < from) overdue.push(t);
    else if (t.dueDate === from) dueToday.push(t);
    else if (t.dueDate <= horizon) soon.push(t);
    else later.push(t);
  }

  const byDue = (a, b) => a.dueDate.localeCompare(b.dueDate);
  overdue.sort(byDue);
  soon.sort(byDue);
  later.sort(byDue);

  return { open, overdue, dueToday, soon, later, undated };
}

const clientOf = (t) => t.client?.name ?? t.clientName ?? null;

function line(t, { from, showLate = false, showDate = false }) {
  const bits = [`• ${t.title}`];
  const client = clientOf(t);
  if (client) bits.push(`(${client})`);
  if (showLate) bits.push(`— ${daysAgo(t.dueDate, from)}d late`);
  else if (showDate && t.dueDate) bits.push(`— ${shortDate(t.dueDate)}`);
  return bits.join(" ");
}

/**
 * A plain-text daily reminder for one person, formatted for WhatsApp —
 * *bold* is the only markup it understands, so the rest stays plain.
 */
export function buildReminder(name, tasks, { from = today(), days = 7 } = {}) {
  const b = bucket(tasks, { from, days });
  const out = [`*${name} — ${headerDate(from)}*`];

  if (!b.open.length) {
    out.push("", "Nothing open. 🎉");
    return out.join("\n");
  }

  if (b.overdue.length) {
    out.push("", `🔴 *Overdue (${b.overdue.length})*`);
    for (const t of b.overdue) out.push(line(t, { from, showLate: true }));
  }
  if (b.dueToday.length) {
    out.push("", `📌 *Due today (${b.dueToday.length})*`);
    for (const t of b.dueToday) out.push(line(t, { from }));
  }
  if (b.soon.length) {
    out.push("", `📅 *Next ${days} days (${b.soon.length})*`);
    for (const t of b.soon) out.push(line(t, { from, showDate: true }));
  }
  if (b.undated.length) {
    out.push("", `🗒 *No due date (${b.undated.length})*`);
    for (const t of b.undated) out.push(line(t, { from }));
  }

  const trailing = b.later.length ? ` · ${b.later.length} scheduled later` : "";
  out.push("", `_${b.open.length} open in total${trailing}_`);

  return out.join("\n");
}

/** One message covering the whole team, for a group chat. */
export function buildTeamReminder(groups, { from = today(), days = 7 } = {}) {
  const parts = [`*Lukreative — tasks for ${headerDate(from)}*`];
  for (const g of groups) {
    if (!g.tasks.some((t) => t.status !== "Completed")) continue;
    parts.push("", "———", buildReminder(g.name, g.tasks, { from, days }));
  }
  return parts.join("\n");
}
