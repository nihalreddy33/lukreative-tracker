import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskTable from "@/components/TaskTable";
import NewTaskForm from "@/components/NewTaskForm";
import Filters from "@/components/Filters";
import ShareLink from "@/components/ShareLink";
import RequestCard from "@/components/RequestCard";
import { Card, Stat, BarList, RequestPill, Empty } from "@/components/ui";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { summarise, countBy } from "@/lib/metrics";
import { applyFilters, sortTasks } from "@/lib/filter";
import { ATTACHMENT_FIELDS } from "@/lib/attachments";
import { today, fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ClientDashboard({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const from = today();

  const client = await prisma.client.findUnique({
    where: { slug },
    include: {
      tasks: {
        include: {
          assignee: true,
          client: true,
          prerequisites: { include: { assignee: true } },
          attachments: { select: ATTACHMENT_FIELDS },
        },
      },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const [members, allClients] = await Promise.all([
    prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
  ]);

  const s = summarise(client.tasks, from);
  const open = client.tasks.filter((t) => t.status !== "Completed");
  const visible = sortTasks(applyFilters(client.tasks, sp, from));
  const pendingReqs = client.requests.filter((r) => r.status === "pending");
  const decidedReqs = client.requests.filter((r) => r.status !== "pending");
  const hiddenCount = open.filter((t) => !t.visibleToClient).length;

  return (
    <>
      <header className="page-head">
        <div>
          <div className="row tight" style={{ marginBottom: 6 }}>
            <span className="dot" style={{ background: client.color, width: 11, height: 11 }} />
            <h1>{client.name}</h1>
          </div>
          <p className="sub">
            {[client.contactName, client.contactEmail].filter(Boolean).join(" · ") ||
              "No contact details saved yet."}
            {hiddenCount ? ` · ${hiddenCount} open task${hiddenCount === 1 ? "" : "s"} hidden from their portal` : ""}
          </p>
        </div>
        <NewTaskForm clients={allClients} members={members} fixedClientId={client.id} />
      </header>

      <div className="stack-v">
        <div className="grid g-4">
          <Stat label="Open tasks" value={s.open} foot={`${s.completed} delivered`} />
          <Stat label="Overdue" value={s.overdue} tone={s.overdue ? "danger" : "good"} />
          <Stat label="Due next 7 days" value={s.dueSoon} tone="warn" />
          <Stat
            label="Pending requests"
            value={pendingReqs.length}
            tone={pendingReqs.length ? "warn" : undefined}
            foot="Awaiting your approval"
          />
        </div>

        <div className="grid g-2">
          <Card title="Their share link">
            <div className="stack-v" style={{ gap: 10 }}>
              <p className="small muted">
                Send this to {client.contactName || "the client"}. It opens their dashboard — they see
                only visible tasks, and can submit new requests for your approval.
              </p>
              <ShareLink clientId={client.id} slug={client.slug} token={client.shareToken} />
            </div>
          </Card>
          <Card title="Open work by team member">
            <BarList
              items={countBy(open, (t) => t.assignee?.name ?? "Unassigned")}
              empty="No open tasks."
            />
          </Card>
        </div>

        {pendingReqs.length ? (
          <div className="stack-v">
            <h2>Requests awaiting approval</h2>
            {pendingReqs.map((r) => (
              <RequestCard key={r.id} req={{ ...r, client }} members={members} />
            ))}
          </div>
        ) : null}

        <Suspense fallback={null}>
          <Filters
            clients={allClients}
            members={members}
            statuses={STATUSES}
            priorities={PRIORITIES}
            hideClient
          />
        </Suspense>

        <Card title={`Tasks (${visible.length})`} bodyless>
          <TaskTable
            tasks={visible}
            members={members}
            clients={allClients}
            showClient={false}
            emptyText="No tasks match these filters."
          />
        </Card>

        {decidedReqs.length ? (
          <Card title="Request history" bodyless>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Request</th><th>From</th><th>Decision</th><th>Note</th><th className="nowrap">Decided</th></tr>
                </thead>
                <tbody>
                  {decidedReqs.map((r) => (
                    <tr key={r.id}>
                      <td className="t-title">{r.title}</td>
                      <td className="nowrap small">{r.requestedBy || "—"}</td>
                      <td><RequestPill value={r.status} /></td>
                      <td className="small muted">{r.decisionNote || "—"}</td>
                      <td className="nowrap small">
                        {r.decidedAt ? fmt(r.decidedAt.toISOString().slice(0, 10)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
