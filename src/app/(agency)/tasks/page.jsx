import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import TaskTable from "@/components/TaskTable";
import NewTaskForm from "@/components/NewTaskForm";
import Filters from "@/components/Filters";
import { Card } from "@/components/ui";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { applyFilters, sortTasks } from "@/lib/filter";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }) {
  const sp = await searchParams;
  const [tasks, clients, members] = await Promise.all([
    prisma.task.findMany({ include: { client: true, assignee: true } }),
    prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const visible = sortTasks(applyFilters(tasks, sp, today()));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>All tasks</h1>
          <p className="sub">
            Showing {visible.length} of {tasks.length} tasks. Edit status, owner and dates right in the table.
          </p>
        </div>
        <NewTaskForm clients={clients} members={members} />
      </header>

      <div className="stack-v">
        <Suspense fallback={null}>
          <Filters clients={clients} members={members} statuses={STATUSES} priorities={PRIORITIES} />
        </Suspense>
        <Card bodyless>
          <TaskTable tasks={visible} members={members} />
        </Card>
      </div>
    </>
  );
}
