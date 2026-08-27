import { prisma } from "./prisma";
import { today, addDays } from "./dates";
import { occurrencesBetween } from "./recurrence";

/**
 * Creates any tasks a repeating series is due to produce.
 *
 * Run lazily whenever an admin loads a page rather than on a schedule, so the
 * app needs no cron and no extra infrastructure. That means it can run twice at
 * once, which is why Task has a unique (recurrenceId, occurrenceDate): a
 * duplicate insert loses the race harmlessly instead of creating the task twice.
 */
export async function generateDueOccurrences(from = today()) {
  const series = await prisma.recurrence.findMany({
    where: { active: true },
    include: {
      tasks: {
        select: { id: true, occurrenceDate: true, status: true },
        orderBy: { occurrenceDate: "desc" },
      },
    },
  });
  if (!series.length) return { created: 0 };

  let created = 0;

  for (const rule of series) {
    // Only look as far ahead as the series wants to run in advance.
    const horizon = addDays(from, Math.max(0, rule.leadDays ?? 0));
    const wanted = occurrencesBetween(rule, rule.startDate || from, horizon);
    if (!wanted.length) continue;

    const existing = new Set(rule.tasks.map((t) => t.occurrenceDate));

    // Leaving a trail of identical unfinished tasks helps nobody, so by default
    // hold off while the previous occurrence is still open.
    const hasOpen = rule.tasks.some((t) => t.status !== "Completed");

    for (const date of wanted) {
      if (existing.has(date)) continue;
      if (rule.skipIfOpen && hasOpen) break;

      try {
        await prisma.task.create({
          data: {
            title: rule.title,
            clientId: rule.clientId,
            assigneeId: rule.assigneeId,
            channel: rule.channel,
            priority: rule.priority,
            notes: rule.notes,
            visibleToClient: rule.visibleToClient,
            status: "Not Started",
            dueDate: date,
            recurrenceId: rule.id,
            occurrenceDate: date,
          },
        });
        created += 1;
        existing.add(date);
        if (rule.skipIfOpen) break; // the one just created is now the open one
      } catch (e) {
        // P2002 is the unique constraint: another request got there first.
        if (e?.code !== "P2002") throw e;
      }
    }
  }

  return { created };
}
