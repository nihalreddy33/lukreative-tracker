import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RequestCard from "@/components/RequestCard";
import { Card, RequestPill, Empty } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const [pending, decided, members] = await Promise.all([
    prisma.taskRequest.findMany({
      where: { status: "pending" },
      include: { client: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskRequest.findMany({
      where: { status: { not: "pending" } },
      include: { client: true, task: true },
      orderBy: { decidedAt: "desc" },
      take: 40,
    }),
    prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Client requests</h1>
          <p className="sub">
            Tasks clients submitted through their share link. Nothing reaches the team board until you approve it.
          </p>
        </div>
      </header>

      <div className="stack-v">
        {pending.length ? (
          <div className="stack-v">
            {pending.map((r) => (
              <RequestCard key={r.id} req={r} members={members} />
            ))}
          </div>
        ) : (
          <Card>
            <Empty>
              No requests waiting. Share a client link from{" "}
              <Link href="/clients">Manage clients</Link> so they can send work in.
            </Empty>
          </Card>
        )}

        <Card title="Decision history" bodyless>
          {decided.length ? (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Request</th><th>Client</th><th>Decision</th>
                    <th>Note</th><th className="nowrap">Decided</th>
                  </tr>
                </thead>
                <tbody>
                  {decided.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="t-title">{r.title}</div>
                        <div className="t-sub">
                          {r.requestedBy ? `from ${r.requestedBy}` : "—"}
                          {r.task ? " · became a task" : ""}
                        </div>
                      </td>
                      <td className="nowrap small">{r.client.name}</td>
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
          ) : (
            <Empty>No decisions yet.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
