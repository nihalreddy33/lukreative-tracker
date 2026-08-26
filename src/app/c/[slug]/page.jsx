import { prisma } from "@/lib/prisma";
import { resolveClient } from "@/lib/auth";
import ClaimLink from "@/components/ClaimLink";
import RequestForm from "@/components/RequestForm";
import { Card, Stat, Pill, Empty } from "@/components/ui";
import { CLIENT_STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { today, fmt, isOverdue } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const client = await prisma.client.findUnique({ where: { slug }, select: { name: true } });
  return { title: client ? `${client.name} — Lukreative Solutions` : "Lukreative Solutions" };
}

function LinkProblem() {
  return (
    <div className="centered">
      <div className="auth-card card card-body stack-v">
        <h1>This link isn&apos;t valid</h1>
        <p className="small muted">
          It may have been regenerated, or the dashboard may have been archived. Ask your contact at
          Lukreative Solutions for a fresh link.
        </p>
      </div>
    </div>
  );
}

export default async function ClientPortal({ params, searchParams }) {
  const { slug } = await params;
  const { k } = await searchParams;

  const client = await resolveClient(slug, k ?? null);
  if (!client) return <LinkProblem />;

  const from = today();
  const [tasks, requests] = await Promise.all([
    prisma.task.findMany({
      where: { clientId: client.id, visibleToClient: true },
      include: { assignee: { select: { name: true } } },
    }),
    prisma.taskRequest.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const delivered = tasks
    .filter((t) => t.status === "Completed")
    .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || ""));
  const pendingReqs = requests.filter((r) => r.status === "pending");

  return (
    <>
      {k ? <ClaimLink slug={slug} token={k} /> : null}

      <div className="portal-top" style={{ background: `linear-gradient(120deg, #0f172a, ${client.color}33)` }}>
        <div className="portal">
          <div>
            <img src="/logo.png" alt="Lukreative Studio" className="brand-logo portal-logo" />
            <h1>{client.name}</h1>
            <p className="sub">Your work with Lukreative Solutions · updated {fmt(from)}</p>
          </div>
          <span className="chip" style={{ background: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.2)", color: "#e2e8f0" }}>
            {active.length} active · {delivered.length} delivered
          </span>
        </div>
      </div>

      <div className="portal portal-body stack-v">
        <div className="grid g-4">
          <Stat label="In progress" value={active.filter((t) => t.status === "In Progress").length} />
          <Stat label="Queued" value={active.filter((t) => t.status === "Not Started").length} />
          <Stat label="Delivered" value={delivered.length} tone="good" />
          <Stat
            label="Awaiting approval"
            value={pendingReqs.length}
            tone={pendingReqs.length ? "warn" : undefined}
            foot="Requests you've sent us"
          />
        </div>

        <RequestForm slug={slug} />

        <Card title={`Work in progress (${active.length})`} bodyless>
          {active.length ? (
            <div className="table-wrap">
              <table className="tbl stack-mobile">
                <thead>
                  <tr><th>Task</th><th>Status</th><th>Owner</th><th className="nowrap">Target date</th></tr>
                </thead>
                <tbody>
                  {active.map((t) => (
                    <tr key={t.id}>
                      <td data-label="">
                        <div className="t-title">{t.title}</div>
                        {t.channel ? <div className="t-sub">{t.channel}</div> : null}
                      </td>
                      <td data-label="Status" className="nowrap">
                        <Pill tone={STATUS_TONE[t.status] || "slate"}>
                          {CLIENT_STATUS_LABEL[t.status] || t.status}
                        </Pill>
                      </td>
                      <td data-label="Owner" className="nowrap small">{t.assignee?.name ?? "Lukreative team"}</td>
                      <td data-label="Target" className="nowrap small">
                        {fmt(t.dueDate)}
                        {isOverdue(t, from) ? (
                          <div><span className="pill amber">running late</span></div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nothing in flight right now. Send a request above to get something started.</Empty>
          )}
        </Card>

        <Card title="Your requests" bodyless>
          {requests.length ? (
            <div className="table-wrap">
              <table className="tbl stack-mobile">
                <thead>
                  <tr><th>Request</th><th>Sent</th><th>Status</th><th>Reply from us</th></tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td data-label="">
                        <div className="t-title">{r.title}</div>
                        {r.requestedBy ? <div className="t-sub">by {r.requestedBy}</div> : null}
                      </td>
                      <td data-label="Sent" className="nowrap small">{fmt(r.createdAt.toISOString().slice(0, 10))}</td>
                      <td data-label="Status" className="nowrap">
                        {r.status === "pending" ? (
                          <Pill tone="amber">Awaiting approval</Pill>
                        ) : r.status === "approved" ? (
                          <Pill tone="green">Accepted</Pill>
                        ) : (
                          <Pill tone="slate">Not taken up</Pill>
                        )}
                      </td>
                      <td data-label="Reply" className="small muted">{r.decisionNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>You haven&apos;t sent any requests yet.</Empty>
          )}
        </Card>

        {delivered.length ? (
          <Card title={`Delivered (${delivered.length})`} bodyless>
            <div className="table-wrap">
              <table className="tbl stack-mobile">
                <thead>
                  <tr><th>Task</th><th className="nowrap">Delivered</th></tr>
                </thead>
                <tbody>
                  {delivered.slice(0, 30).map((t) => (
                    <tr key={t.id}>
                      <td data-label="">
                        <div className="t-title">{t.title}</div>
                        {t.channel ? <div className="t-sub">{t.channel}</div> : null}
                      </td>
                      <td data-label="Delivered" className="nowrap small">{fmt(t.completedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <p className="small muted" style={{ textAlign: "center", paddingTop: 8 }}>
          Lukreative Solutions · this page is private to {client.name}. Please don&apos;t share the link.
        </p>
      </div>
    </>
  );
}
