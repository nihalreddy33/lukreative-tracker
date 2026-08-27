import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConfirmButton from "@/components/ConfirmButton";
import { Card, Empty } from "@/components/ui";
import { setRecurrenceActive, deleteRecurrence } from "@/lib/actions";
import { describeRule, occurrencesBetween } from "@/lib/recurrence";
import { today, addDays, fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const from = today();
  const series = await prisma.recurrence.findMany({
    orderBy: [{ active: "desc" }, { title: "asc" }],
    include: {
      client: { select: { name: true, color: true } },
      assignee: { select: { name: true } },
      tasks: {
        select: { id: true, occurrenceDate: true, status: true },
        orderBy: { occurrenceDate: "desc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Repeating work</h1>
          <p className="sub">
            Set up once, and each due date becomes its own task — so completion, notes and
            images stay per occurrence. Create one from <Link href="/tasks">+ New task</Link>.
          </p>
        </div>
      </header>

      {series.length ? (
        <div className="stack-v">
          {series.map((r) => {
            // The next date the series will actually produce — not simply the
            // next date in the pattern, which may already have been created.
            const made = new Set(r.tasks.map((t) => t.occurrenceDate));
            const next = r.active
              ? occurrencesBetween(r, from, addDays(from, 400)).find((d) => !made.has(d)) ?? null
              : null;
            const open = r.tasks.filter((t) => t.status !== "Completed").length;
            const recent = r.tasks.slice(0, 5);
            return (
              <section className="card" key={r.id} style={{ opacity: r.active ? 1 : 0.6 }}>
                <header className="card-head">
                  <div className="row tight" style={{ minWidth: 0 }}>
                    {r.client ? (
                      <span className="dot" style={{ background: r.client.color }} />
                    ) : null}
                    <h2>{r.title}</h2>
                    {!r.active ? <span className="pill slate">paused</span> : null}
                  </div>
                  <span className="small muted nowrap">
                    {r._count.tasks} created{open ? ` · ${open} open` : ""}
                  </span>
                </header>
                <div className="card-body stack-v" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="pill brand">↻ {describeRule(r)}</span>
                    {next ? <span className="chip">Next new task: {fmt(next)}</span> : null}
                    <span className="chip">{r.assignee?.name ?? "Unassigned"}</span>
                    <span className="chip">{r.client?.name ?? "Internal"}</span>
                    <span className="chip">{r.priority}</span>
                    {r.endDate ? <span className="chip">Until {fmt(r.endDate)}</span> : null}
                  </div>

                  <p className="small muted">
                    Created {r.leadDays === 0 ? "on the day" : `${r.leadDays} days ahead`}
                    {r.skipIfOpen
                      ? " · waits while the previous one is still open"
                      : " · creates the next one regardless"}
                  </p>

                  {recent.length ? (
                    <p className="small muted">
                      Recent:{" "}
                      {recent
                        .map((t) => `${fmt(t.occurrenceDate)}${t.status === "Completed" ? " ✓" : ""}`)
                        .join(" · ")}
                    </p>
                  ) : null}

                  <div className="row">
                    <ConfirmButton
                      action={setRecurrenceActive}
                      className="btn sm"
                      hidden={{ id: r.id, active: r.active ? "no" : "yes" }}
                      message={r.active ? `Pause "${r.title}"? No new tasks will be created until you resume it.` : null}
                    >
                      {r.active ? "Pause" : "Resume"}
                    </ConfirmButton>
                    <ConfirmButton
                      action={deleteRecurrence}
                      className="btn sm danger"
                      hidden={{ id: r.id }}
                      message={`End the "${r.title}" series? Tasks already created are kept.`}
                    >
                      End series
                    </ConfirmButton>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty>
            Nothing repeating yet. Add a task from <Link href="/tasks">All tasks</Link> and set
            it to repeat.
          </Empty>
        </Card>
      )}
    </>
  );
}
