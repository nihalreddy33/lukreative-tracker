import { isOverdue, isDueSoon, daysAgo } from "./dates";

/** Roll a list of tasks up into the numbers every dashboard shows. */
export function summarise(tasks, from) {
  const open = tasks.filter((t) => t.status !== "Completed");
  const overdue = open.filter((t) => isOverdue(t, from));
  return {
    total: tasks.length,
    open: open.length,
    completed: tasks.length - open.length,
    high: open.filter((t) => t.priority === "High").length,
    overdue: overdue.length,
    dueSoon: open.filter((t) => isDueSoon(t, 7, from)).length,
    inProgress: open.filter((t) => t.status === "In Progress").length,
    hold: open.filter((t) => t.status === "Hold").length,
    notStarted: open.filter((t) => t.status === "Not Started").length,
    overdueList: [...overdue].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  };
}

/** Split for the stacked progress bar. Every task lands in exactly one bucket. */
export function split(tasks, from) {
  let done = 0, active = 0, late = 0, hold = 0;
  for (const t of tasks) {
    if (t.status === "Completed") done++;
    else if (isOverdue(t, from)) late++;
    else if (t.status === "Hold") hold++;
    else active++;
  }
  return { done, active, late, hold };
}

export function countBy(tasks, key) {
  const m = new Map();
  for (const t of tasks) {
    const k = key(t);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export const lateBy = (task, from) => daysAgo(task.dueDate, from);
