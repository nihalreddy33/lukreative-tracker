import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, Stat, Empty } from "@/components/ui";
import MyTaskCard from "@/components/MyTaskCard";
import { ATTACHMENT_FIELDS } from "@/lib/attachments";
import { bucket, headerDate } from "@/lib/reminders";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** One person's own work, and nothing else. */
export default async function MyTasks() {
  const session = await getSession();
  if (!session) redirect("/login");

  // The owner login isn't a person, so it has no tasks of its own.
  if (!session.memberId) {
    return (
      <Card title="My tasks">
        <Empty>
          You&apos;re signed in with the owner password, which isn&apos;t tied to a team
          member. Sign in with a member account to see a personal task list.
        </Empty>
      </Card>
    );
  }

  const from = today();
  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.memberId },
    include: {
      client: { select: { name: true, color: true } },
      prerequisites: {
        select: { id: true, title: true, status: true, assignee: { select: { name: true } } },
      },
      attachments: { select: ATTACHMENT_FIELDS },
    },
  });

  const b = bucket(tasks, { from, days: 7 });
  const done = tasks.filter((t) => t.status === "Completed").length;

  const groups = [
    { title: "Overdue", tone: "red", items: b.overdue },
    { title: "Due today", tone: "amber", items: b.dueToday },
    { title: "Next 7 days", tone: "blue", items: b.soon },
    { title: "Later", tone: "slate", items: b.later },
    { title: "No due date", tone: "slate", items: b.undated },
  ].filter((g) => g.items.length);

  return (
    <div className="stack-v">
      <header className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>{session.name}</h1>
          <p className="sub">Your work for {headerDate(from)}.</p>
        </div>
      </header>

      <div className="grid g-4">
        <Stat label="Open" value={b.open.length} />
        <Stat label="Overdue" value={b.overdue.length} tone={b.overdue.length ? "danger" : "good"} />
        <Stat label="Due today" value={b.dueToday.length} tone="warn" />
        <Stat label="Completed" value={done} tone="good" foot="All time" />
      </div>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.title} className="stack-v" style={{ gap: 10 }}>
            <h2>
              <span className={`pill ${g.tone}`}>
                {g.title} ({g.items.length})
              </span>
            </h2>
            {g.items.map((t) => (
              <MyTaskCard key={t.id} task={t} from={from} />
            ))}
          </section>
        ))
      ) : (
        <Card>
          <Empty>Nothing open. 🎉</Empty>
        </Card>
      )}
    </div>
  );
}
