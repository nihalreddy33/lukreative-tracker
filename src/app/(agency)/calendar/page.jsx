import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Empty } from "@/components/ui";
import ImportantDayManager from "@/components/ImportantDayManager";
import CalendarFilters from "@/components/CalendarFilters";
import { MONTH_NAMES, DAY_HEADERS, monthGrid, shiftMonth, daysInMonth, monthKey } from "@/lib/calendar";
import { KIND_TONE } from "@/lib/important-days-seed";
import { today, fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export default async function CalendarPage({ searchParams }) {
  const sp = await searchParams;
  const now = today();

  const year = clamp(Number(sp.y) || Number(now.slice(0, 4)), 2000, 2100);
  const month = clamp((Number(sp.m) || Number(now.slice(5, 7))) - 1, 0, 11);

  const grid = monthGrid(year, month);
  const firstCell = grid[0][0].iso;
  const lastCell = grid[grid.length - 1][6].iso;

  const [clients, members, importantDays, tasks] = await Promise.all([
    prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.importantDay.findMany({ orderBy: { date: "asc" } }),
    prisma.task.findMany({
      // The grid spills into the neighbouring months, so fetch the whole span.
      where: { dueDate: { gte: firstCell, lte: lastCell } },
      include: { client: true, assignee: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const visible = tasks.filter((t) => {
    if (sp.client === "none" ? t.clientId != null : sp.client && t.client?.slug !== sp.client) return false;
    if (sp.owner === "none" ? t.assigneeId != null : sp.owner && String(t.assigneeId) !== sp.owner) return false;
    if (sp.hideDone === "yes" && t.status === "Completed") return false;
    return true;
  });

  const byDate = new Map();
  for (const t of visible) {
    if (!byDate.has(t.dueDate)) byDate.set(t.dueDate, []);
    byDate.get(t.dueDate).push(t);
  }

  const marks = daysInMonth(importantDays, year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const href = (y, m) => `/calendar?y=${y}&m=${m + 1}${sp.client ? `&client=${sp.client}` : ""}${sp.owner ? `&owner=${sp.owner}` : ""}${sp.hideDone ? `&hideDone=${sp.hideDone}` : ""}`;

  const monthTasks = visible.filter((t) => t.dueDate.startsWith(monthKey(year, month)));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            {MONTH_NAMES[month]} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{year}</span>
          </h1>
          <p className="sub">
            {monthTasks.length} task{monthTasks.length === 1 ? "" : "s"} due this month
            {marks.size ? ` · ${marks.size} important day${marks.size === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <div className="row tight">
          <Link className="btn" href={href(prev.year, prev.month)} aria-label="Previous month">‹</Link>
          <Link className="btn" href={`/calendar${sp.client ? `?client=${sp.client}` : ""}`}>Today</Link>
          <Link className="btn" href={href(next.year, next.month)} aria-label="Next month">›</Link>
        </div>
      </header>

      <div className="stack-v">
        <CalendarFilters clients={clients} members={members} />

        <Card bodyless>
          <div className="cal">
            <div className="cal-head">
              {DAY_HEADERS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            {grid.map((week, i) => (
              <div className="cal-week" key={i}>
                {week.map((cell) => {
                  const dayTasks = byDate.get(cell.iso) ?? [];
                  const dayMarks = marks.get(cell.iso) ?? [];
                  return (
                    <div
                      key={cell.iso}
                      className={`cal-cell${cell.inMonth ? "" : " outside"}${cell.iso === now ? " is-today" : ""}`}
                    >
                      <div className="cal-date">
                        <span className={cell.iso === now ? "cal-today-badge" : ""}>{cell.day}</span>
                      </div>

                      {dayMarks.map((d) => (
                        <div key={d.id} className={`cal-mark ${KIND_TONE[d.kind] || "brand"}`} title={`${d.name}${d.note ? ` — ${d.note}` : ""}`}>
                          {d.name}
                        </div>
                      ))}

                      {dayTasks.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className={`cal-task${t.status === "Completed" ? " done" : ""}`}
                          title={`${t.title}${t.client ? ` · ${t.client.name}` : ""}${t.assignee ? ` · ${t.assignee.name}` : ""} · ${t.status}`}
                        >
                          <span className="dot" style={{ background: t.client?.color ?? "#94a3b8" }} />
                          <span className="cal-task-title">{t.title}</span>
                        </div>
                      ))}
                      {dayTasks.length > 4 ? (
                        <div className="cal-more">+{dayTasks.length - 4} more</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {clients.length ? (
          <Card title="Clients">
            <div className="row" style={{ gap: 10 }}>
              {clients.map((c) => (
                <Link key={c.id} className="chip" href={`/calendar?y=${year}&m=${month + 1}&client=${c.slug}`}>
                  <span className="dot" style={{ background: c.color }} />
                  {c.name}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        <ImportantDayManager days={importantDays} />
      </div>
    </>
  );
}
