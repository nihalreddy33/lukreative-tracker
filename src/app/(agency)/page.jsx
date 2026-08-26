import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Stat, BarList, StackBar, StatusPill, PriorityPill, Empty } from "@/components/ui";
import { summarise, split, countBy, lateBy } from "@/lib/metrics";
import { today, fmt, isDueSoon } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const from = today();
  const [tasks, clients, pending] = await Promise.all([
    prisma.task.findMany({ include: { client: true, assignee: true } }),
    prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.taskRequest.count({ where: { status: "pending" } }),
  ]);

  const s = summarise(tasks, from);
  const open = tasks.filter((t) => t.status !== "Completed");

  const byClient = clients
    .map((c) => {
      const mine = tasks.filter((t) => t.clientId === c.id);
      return {
        ...c,
        openCount: mine.filter((t) => t.status !== "Completed").length,
        ...split(mine, from),
      };
    })
    .sort((a, b) => b.openCount - a.openCount || a.name.localeCompare(b.name));

  const byAssignee = countBy(open, (t) => t.assignee?.name ?? "Unassigned");

  const dueSoon = open
    .filter((t) => isDueSoon(t, 7, from))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">
            Everything across {clients.length} clients, as of {fmt(from)}.
          </p>
        </div>
        <div className="row">
          {pending > 0 ? (
            <Link className="btn primary" href="/requests">
              {pending} request{pending === 1 ? "" : "s"} to review
            </Link>
          ) : null}
          <Link className="btn" href="/tasks">Open task list</Link>
        </div>
      </header>

      <div className="stack-v">
        <div className="grid g-4">
          <Stat label="Open tasks" value={s.open} foot={`${s.completed} completed all-time`} />
          <Stat label="Overdue" value={s.overdue} tone={s.overdue ? "danger" : "good"}
            foot={s.overdue ? "Past their due date" : "Nothing past due"} />
          <Stat label="Due next 7 days" value={s.dueSoon} tone="warn" foot="Including today" />
          <Stat label="High priority" value={s.high} foot={`${s.inProgress} in progress · ${s.hold} on hold`} />
        </div>

        <div className="grid g-2">
          <Card title="Workload by client" action={<Link className="btn sm" href="/clients">Manage</Link>}>
            {byClient.length ? (
              <div className="stack-v" style={{ gap: 12 }}>
                {byClient.map((c) => (
                  <div key={c.id}>
                    <div className="spread" style={{ marginBottom: 5 }}>
                      <Link href={`/clients/${c.slug}`} className="row tight" style={{ color: "inherit" }}>
                        <span className="dot" style={{ background: c.color }} />
                        <span style={{ fontSize: 13.5, fontWeight: 550 }}>{c.name}</span>
                      </Link>
                      <span className="small muted nowrap">
                        {c.openCount} open{c.late ? ` · ${c.late} late` : ""}
                      </span>
                    </div>
                    <StackBar {...c} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty>
                No clients yet — <Link href="/clients">add your first one</Link>.
              </Empty>
            )}
          </Card>

          <Card title="Open tasks by team member">
            <BarList items={byAssignee} empty="No open tasks assigned." />
          </Card>
        </div>

        <div className="grid g-2">
          <Card title={`Overdue (${s.overdue})`} bodyless>
            {s.overdueList.length ? (
              <div className="table-wrap">
                <table className="tbl stack-mobile">
                  <thead>
                    <tr><th>Task</th><th>Owner</th><th className="num-cell">Late by</th></tr>
                  </thead>
                  <tbody>
                    {s.overdueList.slice(0, 12).map((t) => (
                      <tr key={t.id}>
                        <td data-label="">
                          <div className="t-title">{t.title}</div>
                          <div className="t-sub">{t.client?.name ?? "No client"} · due {fmt(t.dueDate)}</div>
                        </td>
                        <td data-label="Owner" className="nowrap small">{t.assignee?.name ?? "—"}</td>
                        <td data-label="Late by" className="num-cell nowrap">
                          <span className="pill red">{lateBy(t, from)}d</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Nothing overdue. 🎉</Empty>
            )}
          </Card>

          <Card title={`Due in the next 7 days (${dueSoon.length})`} bodyless>
            {dueSoon.length ? (
              <div className="table-wrap">
                <table className="tbl stack-mobile">
                  <thead>
                    <tr><th>Task</th><th>Owner</th><th>Status</th><th className="nowrap">Due</th></tr>
                  </thead>
                  <tbody>
                    {dueSoon.slice(0, 12).map((t) => (
                      <tr key={t.id}>
                        <td data-label="">
                          <div className="t-title">{t.title}</div>
                          <div className="t-sub">{t.client?.name ?? "No client"}</div>
                        </td>
                        <td data-label="Owner" className="nowrap small">{t.assignee?.name ?? "—"}</td>
                        <td data-label="Status"><StatusPill value={t.status} /></td>
                        <td data-label="Due" className="nowrap small">{fmt(t.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Nothing due this week.</Empty>
            )}
          </Card>
        </div>

        <Card title="High priority, open" bodyless>
          {open.filter((t) => t.priority === "High").length ? (
            <div className="table-wrap">
              <table className="tbl stack-mobile">
                <thead>
                  <tr><th>Task</th><th>Client</th><th>Owner</th><th>Status</th><th>Priority</th><th className="nowrap">Due</th></tr>
                </thead>
                <tbody>
                  {open
                    .filter((t) => t.priority === "High")
                    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
                    .map((t) => (
                      <tr key={t.id}>
                        <td data-label="" className="t-title">{t.title}</td>
                        <td data-label="Client" className="nowrap small">{t.client?.name ?? "—"}</td>
                        <td data-label="Owner" className="nowrap small">{t.assignee?.name ?? "—"}</td>
                        <td data-label="Status"><StatusPill value={t.status} /></td>
                        <td data-label="Priority"><PriorityPill value={t.priority} /></td>
                        <td data-label="Due" className="nowrap small">{fmt(t.dueDate)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No high-priority work open.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
