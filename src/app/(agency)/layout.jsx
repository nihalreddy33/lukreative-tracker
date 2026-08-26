import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AgencyLayout({ children }) {
  if (!(await isAdmin())) redirect("/login");

  const [clients, openCount, pendingCount] = await Promise.all([
    prisma.client.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        color: true,
        _count: { select: { tasks: { where: { status: { not: "Completed" } } } } },
      },
    }),
    prisma.task.count({ where: { status: { not: "Completed" } } }),
    prisma.taskRequest.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="shell">
      <Nav
        clients={clients.map((c) => ({ ...c, openCount: c._count.tasks }))}
        openCount={openCount}
        pendingCount={pendingCount}
      />
      <main className="main">{children}</main>
    </div>
  );
}
