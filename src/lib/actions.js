"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  requireAdmin,
  requireSession,
  requireClient,
  signInAdmin,
  signInMember,
  signOutAdmin,
  newShareToken,
  grantClientSession,
  hashPassword,
} from "./auth";
import { today } from "./dates";
import { STATUSES, PRIORITIES } from "./constants";

const str = (fd, k) => String(fd.get(k) ?? "").trim();
const num = (fd, k) => {
  const v = str(fd, k);
  return v ? Number(v) : null;
};
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(name) {
  const base = slugify(name) || "client";
  let slug = base;
  for (let i = 2; await prisma.client.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

function refreshAgency() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ sessions

export async function loginAction(_prev, formData) {
  const who = str(formData, "identifier");
  const password = str(formData, "password");

  // No name given means the owner's break-glass password, which is also how
  // the app worked before accounts existed.
  if (!who) {
    if (await signInAdmin(password)) redirect("/");
    return { error: "That password doesn't match." };
  }

  const member = await signInMember(who, password);
  if (!member) return { error: "That name and password don't match." };
  redirect(member.isAdmin ? "/" : "/my");
}

export async function logoutAction() {
  await signOutAdmin();
  redirect("/login");
}

// --------------------------------------------------------------------- tasks

export async function createTask(formData) {
  await requireAdmin();
  const title = str(formData, "title");
  if (!title) return;

  await prisma.task.create({
    data: {
      title,
      channel: str(formData, "channel"),
      priority: oneOf(str(formData, "priority"), PRIORITIES, "Medium"),
      status: oneOf(str(formData, "status"), STATUSES, "Not Started"),
      clientId: num(formData, "clientId"),
      assigneeId: num(formData, "assigneeId"),
      startDate: str(formData, "startDate"),
      dueDate: str(formData, "dueDate"),
      notes: str(formData, "notes"),
      visibleToClient: str(formData, "visibleToClient") !== "no",
    },
  });
  refreshAgency();
}

// What a member may change on their own task. Everything else — who owns it,
// which client it belongs to, its priority, whether the client can see it — is
// a scheduling decision that stays with an admin.
const MEMBER_EDITABLE = new Set(["status", "startDate", "dueDate", "notes", "channel"]);

export async function updateTask(formData) {
  const session = await requireSession();
  const id = num(formData, "id");
  if (!id) return;

  if (!session.isAdmin) {
    const owned = await prisma.task.findFirst({
      where: { id, assigneeId: session.memberId },
      select: { id: true },
    });
    if (!owned) throw new Error("Not authorised");
    for (const key of formData.keys()) {
      if (key !== "id" && !MEMBER_EDITABLE.has(key)) throw new Error("Not authorised");
    }
  }

  const data = {};
  const has = (k) => formData.get(k) !== null;

  if (has("title")) data.title = str(formData, "title");
  if (has("channel")) data.channel = str(formData, "channel");
  if (has("priority")) data.priority = oneOf(str(formData, "priority"), PRIORITIES, "Medium");
  if (has("clientId")) data.clientId = num(formData, "clientId");
  if (has("assigneeId")) data.assigneeId = num(formData, "assigneeId");
  if (has("startDate")) data.startDate = str(formData, "startDate");
  if (has("dueDate")) data.dueDate = str(formData, "dueDate");
  if (has("notes")) data.notes = str(formData, "notes");
  if (has("visibleToClient")) data.visibleToClient = str(formData, "visibleToClient") !== "no";

  if (has("status")) {
    const status = oneOf(str(formData, "status"), STATUSES, "Not Started");
    data.status = status;
    // Stamp the completion date on the way in, clear it on the way out, but
    // never overwrite a date that's already recorded.
    const current = await prisma.task.findUnique({ where: { id } });
    if (status === "Completed") {
      data.completedDate = current?.completedDate || today();
    } else {
      data.completedDate = "";
    }
  }

  await prisma.task.update({ where: { id }, data });
  refreshAgency();
}

export async function deleteTask(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (id) await prisma.task.delete({ where: { id } });
  refreshAgency();
}

/**
 * Attaches a prerequisite: either an existing task, or a brand new one created
 * and assigned on the spot (the usual case — "this needs copy from someone
 * first" is normally work nobody has written down yet).
 */
export async function addPrerequisite(formData) {
  await requireAdmin();
  const taskId = num(formData, "taskId");
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { prerequisites: { select: { id: true } } },
  });
  if (!task) return;

  let prereqId = num(formData, "prerequisiteId");

  if (!prereqId) {
    const title = str(formData, "newTitle");
    if (!title) return { error: "Give the prerequisite a name." };
    const created = await prisma.task.create({
      data: {
        title,
        clientId: task.clientId,
        assigneeId: num(formData, "newAssigneeId"),
        priority: oneOf(str(formData, "newPriority"), PRIORITIES, task.priority),
        dueDate: str(formData, "newDueDate"),
        status: "Not Started",
        visibleToClient: task.visibleToClient,
      },
    });
    prereqId = created.id;
  }

  // A task can't block itself, and refuse a link that would close a cycle.
  if (prereqId === taskId) return { error: "A task can't depend on itself." };
  if (await wouldCycle(prereqId, taskId)) {
    return { error: "That would create a circular dependency." };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { prerequisites: { connect: { id: prereqId } } },
  });
  refreshAgency();
}

/** True if `startId` already depends, directly or transitively, on `targetId`. */
async function wouldCycle(startId, targetId) {
  const seen = new Set();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift();
    if (id === targetId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = await prisma.task.findUnique({
      where: { id },
      select: { prerequisites: { select: { id: true } } },
    });
    for (const p of node?.prerequisites ?? []) queue.push(p.id);
  }
  return false;
}

export async function removePrerequisite(formData) {
  await requireAdmin();
  const taskId = num(formData, "taskId");
  const prereqId = num(formData, "prerequisiteId");
  if (!taskId || !prereqId) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { prerequisites: { disconnect: { id: prereqId } } },
  });
  refreshAgency();
}

// ------------------------------------------------------------------- clients

export async function createClient(formData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;
  if (await prisma.client.findUnique({ where: { name } })) return;

  await prisma.client.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      shareToken: newShareToken(),
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      color: str(formData, "color") || "#6366f1",
    },
  });
  refreshAgency();
}

export async function updateClient(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;
  await prisma.client.update({
    where: { id },
    data: {
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      color: str(formData, "color") || "#6366f1",
    },
  });
  refreshAgency();
}

/** Invalidates the old link everywhere it was shared. */
export async function regenerateShareToken(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;
  await prisma.client.update({
    where: { id },
    data: { shareToken: newShareToken() },
  });
  refreshAgency();
}

export async function setClientArchived(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;
  await prisma.client.update({
    where: { id },
    data: { archived: str(formData, "archived") === "yes" },
  });
  refreshAgency();
}

// ------------------------------------------------------------------- members

export async function createMember(formData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;
  if (await prisma.member.findUnique({ where: { name } })) return;
  await prisma.member.create({ data: { name, role: str(formData, "role") } });
  refreshAgency();
}

export async function setMemberActive(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;
  await prisma.member.update({
    where: { id },
    data: { active: str(formData, "active") === "yes" },
  });
  refreshAgency();
}

export async function setMemberPassword(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  const password = str(formData, "password");
  if (!id) return;
  if (password && password.length < 6) {
    return { error: "Use at least 6 characters." };
  }
  await prisma.member.update({
    where: { id },
    // An empty value clears the password, which locks the account out of
    // signing in without deleting any of their task history.
    data: { passwordHash: password ? hashPassword(password) : "" },
  });
  refreshAgency();
  return { ok: true };
}

export async function updateMemberAccess(formData) {
  const session = await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;

  const makeAdmin = str(formData, "isAdmin") === "yes";

  // Don't let the last admin demote themselves out of the admin pages.
  if (!makeAdmin) {
    const admins = await prisma.member.count({ where: { isAdmin: true, active: true } });
    const target = await prisma.member.findUnique({ where: { id }, select: { isAdmin: true } });
    if (target?.isAdmin && admins <= 1 && session.kind !== "owner") {
      return { error: "That's the only admin left." };
    }
  }

  await prisma.member.update({
    where: { id },
    data: { isAdmin: makeAdmin, email: str(formData, "email") },
  });
  refreshAgency();
  return { ok: true };
}

// ------------------------------------------------------------------ requests

export async function approveRequest(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;

  const req = await prisma.taskRequest.findUnique({ where: { id } });
  if (!req || req.status !== "pending") return;

  // One transaction so a request can never be marked approved without the
  // task it promised actually existing.
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: str(formData, "title") || req.title,
        clientId: req.clientId,
        assigneeId: num(formData, "assigneeId"),
        priority: oneOf(str(formData, "priority"), PRIORITIES, req.priority),
        status: "Not Started",
        dueDate: str(formData, "dueDate") || req.neededBy,
        channel: str(formData, "channel"),
        notes: [req.details, req.requestedBy && `Requested by ${req.requestedBy}`]
          .filter(Boolean)
          .join("\n\n"),
        visibleToClient: true,
      },
    });
    await tx.taskRequest.update({
      where: { id },
      data: {
        status: "approved",
        decidedAt: new Date(),
        decisionNote: str(formData, "decisionNote"),
        taskId: task.id,
      },
    });
  });
  refreshAgency();
}

export async function declineRequest(formData) {
  await requireAdmin();
  const id = num(formData, "id");
  if (!id) return;
  await prisma.taskRequest.update({
    where: { id, status: "pending" },
    data: {
      status: "declined",
      decidedAt: new Date(),
      decisionNote: str(formData, "decisionNote"),
    },
  });
  refreshAgency();
}

// -------------------------------------------------------------- client portal

export async function submitRequest(_prev, formData) {
  const slug = str(formData, "slug");
  const client = await requireClient(slug);

  const title = str(formData, "title");
  if (!title) return { error: "Please describe what you need." };

  await prisma.taskRequest.create({
    data: {
      clientId: client.id,
      title,
      details: str(formData, "details"),
      requestedBy: str(formData, "requestedBy"),
      priority: oneOf(str(formData, "priority"), PRIORITIES, "Medium"),
      neededBy: str(formData, "neededBy"),
    },
  });

  revalidatePath(`/c/${slug}`);
  revalidatePath("/requests");
  return { ok: true };
}

/** Exchanges a ?k= token for a cookie so the link works on later visits. */
export async function claimClientLink(slug, token) {
  await grantClientSession(slug, token);
}
