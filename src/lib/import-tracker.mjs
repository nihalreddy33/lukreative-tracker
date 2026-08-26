/**
 * Imports the agency's Excel tracker.
 *
 * Parsing is separate from writing so the mapping can be exercised without a
 * database, and so the same code backs both the CLI and the in-app upload.
 */

import { randomBytes } from "node:crypto";
import { readWorkbookBuffer } from "./xlsx.mjs";

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

/** Excel serial (1899-12-30 epoch) -> "YYYY-MM-DD". Passes real dates through. */
export function toISODate(v) {
  if (!v) return "";
  const n = Number(v);
  if (!Number.isNaN(n) && n > 20000 && n < 90000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
  }
  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? "" : new Date(parsed).toISOString().slice(0, 10);
}

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/**
 * Reads a workbook into the shapes the database expects. No side effects, so
 * this can be checked against a real file without a connection.
 */
export function parseWorkbook(buffer) {
  const book = readWorkbookBuffer(buffer);

  // The two task sheets, whatever they're called. Dashboard and Calc_Data are
  // derived numbers we recompute ourselves.
  const sheets = Object.entries(book).filter(
    ([name]) => /task/i.test(name) && !/calc|dashboard/i.test(name)
  );
  if (!sheets.length) {
    throw new Error(
      "No task sheets found. Expected a sheet with \"Task\" in its name, " +
        `got: ${Object.keys(book).join(", ") || "(none)"}`
    );
  }

  const rows = [];
  for (const [name, sheet] of sheets) {
    for (const r of sheet.slice(1)) {
      if (r[COL.title]) rows.push({ sheet: name, ...r });
    }
  }

  const clientNames = [...new Set(rows.map((r) => r[COL.client]).filter(Boolean))].sort();
  const memberNames = [...new Set(rows.map((r) => r[COL.assignee]).filter(Boolean))].sort();

  const clients = clientNames.map((name, i) => ({
    name,
    slug: slugify(name) || `client-${i}`,
    color: PALETTE[i % PALETTE.length],
  }));

  const tasks = rows.map((r) => {
    const fromCompletedSheet = /completed/i.test(r.sheet);
    const rawStatus = (r[COL.status] || "").toLowerCase();
    const status =
      STATUS_MAP[rawStatus] || (fromCompletedSheet ? "Completed" : "Not Started");
    const completedDate = toISODate(r[COL.completed]);

    return {
      title: r[COL.title],
      clientName: r[COL.client] || null,
      assigneeName: r[COL.assignee] || null,
      channel: r[COL.channel] || "",
      priority: PRIORITY_MAP[(r[COL.priority] || "").toLowerCase()] || "Medium",
      status,
      startDate: toISODate(r[COL.start]),
      dueDate: toISODate(r[COL.due]),
      // A completed task with no recorded date falls back to its due date, so
      // it isn't shown as delivered on an unknown day.
      completedDate: status === "Completed" ? completedDate || toISODate(r[COL.due]) : "",
      notes: r[COL.notes] || "",
      visibleToClient: true,
    };
  });

  return { clients, members: memberNames.map((name) => ({ name })), tasks, sheets: sheets.map(([n]) => n) };
}

/**
 * Writes parsed rows. Idempotent: clients and members match on name, tasks on
 * (title, client), so re-importing updates rather than duplicating.
 */
export async function applyToDatabase(prisma, parsed) {
  const clientsByName = new Map();
  for (const c of parsed.clients) {
    const row = await prisma.client.upsert({
      where: { name: c.name },
      update: {},
      create: { ...c, shareToken: randomBytes(18).toString("base64url") },
    });
    clientsByName.set(c.name, row);
  }

  const membersByName = new Map();
  for (const m of parsed.members) {
    const row = await prisma.member.upsert({
      where: { name: m.name },
      update: {},
      create: { name: m.name },
    });
    membersByName.set(m.name, row);
  }

  let created = 0;
  let updated = 0;

  for (const t of parsed.tasks) {
    const { clientName, assigneeName, ...rest } = t;
    const data = {
      ...rest,
      clientId: clientName ? clientsByName.get(clientName)?.id ?? null : null,
      assigneeId: assigneeName ? membersByName.get(assigneeName)?.id ?? null : null,
    };

    const existing = await prisma.task.findFirst({
      where: { title: data.title, clientId: data.clientId },
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

  return {
    clients: [...clientsByName.values()],
    memberCount: membersByName.size,
    created,
    updated,
  };
}
