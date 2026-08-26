import { prisma } from "@/lib/prisma";
import ImportForm from "@/components/ImportForm";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [clients, members, tasks] = await Promise.all([
    prisma.client.count(),
    prisma.member.count(),
    prisma.task.count(),
  ]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Import from Excel</h1>
          <p className="sub">
            Load the tracker spreadsheet straight into this dashboard. Safe to re-run —
            it updates rather than duplicating.
          </p>
        </div>
      </header>

      <div className="grid g-2">
        <Card title="Upload">
          <ImportForm />
        </Card>

        <Card title="What it does">
          <div className="stack-v small" style={{ gap: 10, color: "var(--ink-2)" }}>
            <p>
              Reads both task sheets — open and completed — and ignores Dashboard and
              Calc_Data, whose numbers this app recomputes.
            </p>
            <p>
              Clients and team members are created from the Client and Assignee columns.
              Excel serial dates become real dates.
            </p>
            <p>
              Tasks are matched on name and client, so importing an updated
              spreadsheet refreshes existing rows instead of creating duplicates.
            </p>
            <p>
              Every imported task is visible to its client. Flip anything internal to
              Hidden on the task list afterwards.
            </p>
            <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "2px 0" }} />
            <p className="muted">
              Currently holding {tasks} tasks, {clients} clients, {members} team members.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
