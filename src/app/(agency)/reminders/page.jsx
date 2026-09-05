import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ReminderCard from "@/components/ReminderCard";
import CopyTeamMessage from "@/components/CopyTeamMessage";
import AutoRefresh from "@/components/AutoRefresh";
import { Card, Empty } from "@/components/ui";
import { bucket, buildReminder, buildTeamReminder, shortDate, headerDate } from "@/lib/reminders";
import { today, daysAgo } from "@/lib/dates";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 0, label: "Today" },
  { days: 3, label: "3 days" },
  { days: 7, label: "This week" },
];

function Group({ title, tone, tasks, from, showLate, showDate }) {
  if (!tasks.length) return null;
  return (
    <div>
      <h3 className={`pill ${tone}`} style={{ marginBottom: 7 }}>
        {title} ({tasks.length})
      </h3>
      <div className="stack-v" style={{ gap: 5 }}>
        {tasks.map((t) => (
          <div key={t.id} className="spread" style={{ alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 13.5 }}>
              {t.title}
              {t.client ? <span className="muted small"> · {t.client.name}</span> : null}
            </span>
            <span className="small nowrap" style={{ color: showLate ? "var(--red)" : "var(--ink-3)" }}>
              {showLate
                ? `${daysAgo(t.dueDate, from)}d late`
                : showDate && t.dueDate
                  ? shortDate(t.dueDate)
                  : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function RemindersPage({ searchParams }) {
  const sp = await searchParams;
  const days = RANGES.some((r) => String(r.days) === sp.days) ? Number(sp.days) : 7;
  const from = today();

  const [members, tasks] = await Promise.all([
    prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: { status: { not: "Completed" } },
      include: { client: true, assignee: { select: { name: true } } },
    }),
  ]);

  // Anyone still holding open work gets a section, including a deactivated
  // member: their tasks would otherwise belong to no group at all and vanish
  // from the page entirely.
  const owners = new Map(members.map((m) => [m.id, m.name]));
  for (const t of tasks) {
    if (t.assigneeId && !owners.has(t.assigneeId)) {
      owners.set(t.assigneeId, `${t.assignee?.name ?? "Unknown"} (inactive)`);
    }
  }

  const groups = [
    ...[...owners.entries()].map(([id, name]) => ({
      key: String(id),
      memberId: id,
      hasPhone: !!members.find((m) => m.id === id)?.phone,
      name,
      tasks: tasks.filter((t) => t.assigneeId === id),
    })),
    { key: "unassigned", name: "Unassigned", tasks: tasks.filter((t) => !t.assigneeId) },
  ].filter((g) => g.tasks.length || g.key !== "unassigned");

  const teamMessage = buildTeamReminder(groups, { from, days });
  const anyOpen = groups.some((g) => g.tasks.length);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Daily reminders</h1>
          <p className="sub">
            Each person&apos;s open work for {headerDate(from)}, ready to paste into WhatsApp.
          </p>
        </div>
        <div className="row">
          <AutoRefresh />
          {anyOpen ? <CopyTeamMessage message={teamMessage} /> : null}
          <Link className="btn" href="/tasks">Open task list</Link>
        </div>
      </header>

      <div className="stack-v">
        <div className="tabs">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/reminders?days=${r.days}`}
              className={days === r.days ? "active" : ""}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {!members.length ? (
          <Card>
            <Empty>
              No team members yet — add them on the <Link href="/team">Team</Link> page.
            </Empty>
          </Card>
        ) : null}

        {groups.map((g) => {
          const b = bucket(g.tasks, { from, days, includeHold: false });
          const message = buildReminder(g.name, g.tasks, { from, days });
          const counts = {
            open: b.open.length,
            overdue: b.overdue.length,
            dueToday: b.dueToday.length,
          };

          return (
            <ReminderCard
              key={g.key}
              name={g.name}
              message={message}
              counts={counts}
              memberId={g.memberId}
              hasPhone={g.hasPhone}
            >
              {b.open.length ? (
                <>
                  <Group title="Overdue" tone="red" tasks={b.overdue} from={from} showLate />
                  <Group title="Due today" tone="amber" tasks={b.dueToday} from={from} />
                  <Group
                    title={days === 0 ? "Coming up" : `Next ${days} days`}
                    tone="blue"
                    tasks={b.soon}
                    from={from}
                    showDate
                  />
                  <Group title="No due date" tone="slate" tasks={b.undated} from={from} />
                  {/* Listed, not just counted: a task created with a date
                      further out was otherwise nowhere on this page. It stays
                      out of the copied message, which is about today. */}
                  <Group title="Later" tone="slate" tasks={b.later} from={from} showDate />
                  <p className="small muted">
                    {b.open.length} open in total
                    {b.later.length ? " · later work isn't in the copied message" : ""}
                    {b.held.length ? ` · ${b.held.length} on hold, not shown` : ""}
                  </p>
                </>
              ) : (
                <p className="small muted">
                  Nothing to chase.
                  {b.held.length ? ` ${b.held.length} task${b.held.length === 1 ? "" : "s"} on hold.` : ""}
                </p>
              )}
            </ReminderCard>
          );
        })}
      </div>
    </>
  );
}
