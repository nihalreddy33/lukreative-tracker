import { isOverdue, today } from "./dates";

/**
 * Apply the URL filters to a task list. Default (no `status` param) hides
 * completed work — the list is a to-do board first.
 */
export function applyFilters(tasks, sp, from = today()) {
  const q = (sp.q ?? "").toLowerCase().trim();
  const { client, owner, status, priority } = sp;

  return tasks.filter((t) => {
    if (q) {
      const hay = `${t.title} ${t.channel} ${t.notes} ${t.client?.name ?? ""} ${t.assignee?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (client === "none" ? t.clientId != null : client && t.client?.slug !== client) return false;
    if (owner === "none" ? t.assigneeId != null : owner && String(t.assigneeId) !== owner) return false;
    if (priority && t.priority !== priority) return false;

    if (!status) return t.status !== "Completed";
    if (status === "all") return true;
    if (status === "overdue") return isOverdue(t, from);
    return t.status === status;
  });
}

/** Overdue first, then soonest due, then unscheduled. */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const ad = a.dueDate || "9999-12-31";
    const bd = b.dueDate || "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.title.localeCompare(b.title);
  });
}
