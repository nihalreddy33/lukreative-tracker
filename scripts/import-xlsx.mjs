/**
 * One-time import of the existing Excel tracker.
 *
 *   npm run import -- "/path/to/Lukreative Digital Marketing Task Tracker.xlsx"
 *
 * Idempotent: clients and members are matched by name, and a task is matched by
 * (title, client), so re-running updates rather than duplicating.
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { readWorkbook } from "./xlsx.mjs";
import { resolveDatabaseUrl, describeTarget } from "../src/lib/db-url.mjs";

const resolved = resolveDatabaseUrl();
if (!resolved.url) {
  console.error(`\n  \u2717 ${resolved.reason}\n`);
  process.exit(1);
}
console.log(`Using ${resolved.source} \u2192 ${describeTarget(resolved.url)}`);

const prisma = new PrismaClient({ datasourceUrl: resolved.url });

// Column layout of both task sheets.
const COL = {
  title: "B", assignee: "C", client: "D", channel: "E", priority: "F",
  status: "G", start: "H", due: "I", completed: "J", notes: "L",
};

const PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#a855f7", "#14b8a6", "#f43f5e", "#8b5cf6", "#059669",
];

const STATUS_MAP = {
  "in progress": "In Progress",
  completed: "Completed",
  complete: "Completed",
  done: "Completed",
  hold: "Hold",
  "on hold": "Hold",
  "not started": "Not Started",
};

const PRIORITY_MAP = { high: "High", medium: "Medium", low: "Low" };

/** Excel serial (1899-12-30 epoch) -> "YYYY-MM-DD". Passes through real dates. */
function toISODate(v) {
  if (!v) return "";
  const n = Number(v);
  if (!Number.isNaN(n) && n > 20000 && n < 90000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? "" : new Date(parsed).toISOString().slice(0, 10);
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

async function main() {
  const path =
    process.argv[2] ||
    `${process.env.HOME}/Downloads/Lukreative Digital Marketing Task Tracker.xlsx`;

  const book = readWorkbook(path);

  // The two task sheets, whatever their exact names. Everything else (Dashboard,
  // Calc_Data) is derived data we recompute ourselves.
  const sheets = Object.entries(book).filter(
    ([name]) => /task/i.test(name) && !/calc|dashboard/i.test(name)
  );
  if (!sheets.length) throw new Error(`No task sheets found in ${path}`);

  const rows = [];
  for (const [name, sheet] of sheets) {
    // Skip the header row, keep anything with a task name.
    for (const r of sheet.slice(1)) {
      if (r[COL.title]) rows.push({ sheet: name, ...r });
    }
  }
  console.log(`Read ${rows.length} task rows from ${sheets.length} sheet(s).`);

  // ---- clients ------------------------------------------------------------
  const clientNames = [...new Set(rows.map((r) => r[COL.client]).filter(Boolean))].sort();
  const clientsByName = new Map();
  for (const [i, name] of clientNames.entries()) {
    const client = await prisma.client.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: slugify(name) || `client-${i}`,
        shareToken: randomBytes(18).toString("base64url"),
        color: PALETTE[i % PALETTE.length],
      },
    });
    clientsByName.set(name, client);
  }

  // ---- team ---------------------------------------------------------------
  const memberNames = [...new Set(rows.map((r) => r[COL.assignee]).filter(Boolean))].sort();
  const membersByName = new Map();
  for (const name of memberNames) {
    const member = await prisma.member.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    membersByName.set(name, member);
  }

  // ---- tasks --------------------------------------------------------------
  let created = 0;
  let updated = 0;

  for (const r of rows) {
    const title = r[COL.title];
    const client = r[COL.client] ? clientsByName.get(r[COL.client]) : null;
    const member = r[COL.assignee] ? membersByName.get(r[COL.assignee]) : null;

    const fromCompletedSheet = /completed/i.test(r.sheet);
    const rawStatus = (r[COL.status] || "").toLowerCase();
    const status =
      STATUS_MAP[rawStatus] || (fromCompletedSheet ? "Completed" : "Not Started");

    const completedDate = toISODate(r[COL.completed]);

    const data = {
      title,
      channel: r[COL.channel] || "",
      priority: PRIORITY_MAP[(r[COL.priority] || "").toLowerCase()] || "Medium",
      status,
      clientId: client?.id ?? null,
      assigneeId: member?.id ?? null,
      startDate: toISODate(r[COL.start]),
      dueDate: toISODate(r[COL.due]),
      // A completed task with no recorded date falls back to its due date, so
      // it doesn't show as delivered on an unknown day.
      completedDate:
        status === "Completed" ? completedDate || toISODate(r[COL.due]) : "",
      notes: r[COL.notes] || "",
      visibleToClient: true,
    };

    const existing = await prisma.task.findFirst({
      where: { title, clientId: data.clientId },
      select: { id: true },
    });

    if (existing) {
      await prisma.task.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.task.create({ data });
      created++;
    }
  }

  console.log(
    `Done. ${clientsByName.size} clients, ${membersByName.size} team members, ` +
      `${created} tasks created, ${updated} updated.`
  );

  for (const c of clientsByName.values()) {
    console.log(`  ${c.name.padEnd(22)} /c/${c.slug}?k=${c.shareToken}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
