import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewClientForm from "@/components/NewClientForm";
import ShareLink from "@/components/ShareLink";
import ConfirmButton from "@/components/ConfirmButton";
import { Card, StackBar, Empty } from "@/components/ui";
import { setClientArchived } from "@/lib/actions";
import { split } from "@/lib/metrics";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const from = today();
  const clients = await prisma.client.findMany({
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: {
      tasks: true,
      _count: { select: { requests: { where: { status: "pending" } } } },
    },
  });

  const active = clients.filter((c) => !c.archived);
  const archived = clients.filter((c) => c.archived);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="sub">
            Each client gets one private link. Send it once — they can open their dashboard and submit
            requests without any signup.
          </p>
        </div>
        <NewClientForm />
      </header>

      <div className="stack-v">
        {active.length ? (
          <div className="grid g-2">
            {active.map((c) => {
              const s = split(c.tasks, from);
              const open = c.tasks.filter((t) => t.status !== "Completed").length;
              return (
                <section className="card" key={c.id}>
                  <header className="card-head">
                    <Link href={`/clients/${c.slug}`} className="row tight" style={{ color: "inherit" }}>
                      <span className="dot" style={{ background: c.color, width: 10, height: 10 }} />
                      <h2>{c.name}</h2>
                    </Link>
                    <span className="small muted nowrap">
                      {open} open · {s.done} done
                      {c._count.requests ? ` · ${c._count.requests} pending` : ""}
                    </span>
                  </header>
                  <div className="card-body stack-v" style={{ gap: 12 }}>
                    <StackBar {...s} />
                    {c.contactName || c.contactEmail ? (
                      <p className="small muted">
                        {[c.contactName, c.contactEmail].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <ShareLink clientId={c.id} slug={c.slug} token={c.shareToken} />
                    <div className="row">
                      <Link className="btn sm" href={`/clients/${c.slug}`}>Open dashboard</Link>
                      <ConfirmButton
                        action={setClientArchived}
                        className="btn sm ghost"
                        hidden={{ id: c.id, archived: "yes" }}
                        message={`Archive ${c.name}? Their share link stops working and they drop out of the sidebar. Tasks are kept.`}
                      >
                        Archive
                      </ConfirmButton>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Card>
            <Empty>No clients yet. Add one to generate its share link.</Empty>
          </Card>
        )}

        {archived.length ? (
          <Card title={`Archived (${archived.length})`}>
            <div className="stack-v" style={{ gap: 8 }}>
              {archived.map((c) => (
                <div className="spread" key={c.id}>
                  <span className="row tight">
                    <span className="dot" style={{ background: c.color }} />
                    <span className="small">{c.name}</span>
                    <span className="small muted">· {c.tasks.length} tasks kept</span>
                  </span>
                  <ConfirmButton
                    action={setClientArchived}
                    className="btn sm"
                    hidden={{ id: c.id, archived: "no" }}
                    message={`Restore ${c.name}? Their existing share link works again.`}
                  >
                    Restore
                  </ConfirmButton>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
