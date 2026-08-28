import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDueOccurrences } from "@/lib/generate-recurring";
import { seedImportantDays } from "@/lib/seed-important-days";

export const dynamic = "force-dynamic";

export default async function AgencyLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // A member has no business on the agency pages; their own list is at /my.
  if (!session.isAdmin) redirect("/my");

  // Repeating work is generated lazily on an admin page load rather than by a
  // scheduler, so the app needs no cron. It is idempotent.
  // Swallowing these silently once hid a seeding failure completely, so they
  // report rather than disappear. Neither should ever block the page.
  await generateDueOccurrences().catch((e) =>
    console.error("[recurring] generation failed:", e?.message)
  );
  await seedImportantDays().catch((e) =>
    console.error("[important-days] seeding failed:", e?.message)
  );

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
