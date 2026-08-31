"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTask } from "@/lib/actions";
import { STATUSES } from "@/lib/constants";
import { fmt, isOverdue } from "@/lib/dates";
import { daysAgo } from "@/lib/dates";
import Attachments from "./Attachments";
import AttachmentPeek from "./AttachmentPeek";

/**
 * A member's own task. Only the fields they're allowed to change are offered —
 * owner, client, priority and client visibility are an admin's call, and the
 * server rejects them regardless of what's on screen.
 */
export default function MyTaskCard({ task, from }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const late = isOverdue(task, from);
  const blocked = (task.prerequisites ?? []).filter((p) => p.status !== "Completed");

  const save = (fd) =>
    start(async () => {
      fd.append("id", String(task.id));
      await updateTask(fd);
      router.refresh();
    });

  const quickStatus = (status) => {
    const fd = new FormData();
    fd.append("status", status);
    save(fd);
  };

  return (
    <article className="card" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="card-body stack-v" style={{ gap: 10 }}>
        <div className="spread" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div className="t-title" style={{ fontSize: 15 }}>{task.title}</div>
            <div className="small muted" style={{ marginTop: 3 }}>
              {task.client ? (
                <span className="row tight" style={{ display: "inline-flex" }}>
                  <span className="dot" style={{ background: task.client.color }} />
                  {task.client.name}
                </span>
              ) : (
                "Internal"
              )}
              {task.channel ? ` · ${task.channel}` : ""}
              {task.dueDate ? ` · due ${fmt(task.dueDate)}` : " · no due date"}
            </div>
          </div>
          <div className="row tight nowrap">
            {task.attachments?.length ? <AttachmentPeek attachments={task.attachments} /> : null}
            {late ? <span className="pill red">{daysAgo(task.dueDate, from)}d late</span> : null}
            <span className={`pill ${task.priority === "High" ? "red" : "slate"}`}>
              {task.priority}
            </span>
          </div>
        </div>

        {blocked.length ? (
          <div className="notice info small">
            Waiting on {blocked.map((b) => `${b.title}${b.assignee ? ` (${b.assignee.name})` : ""}`).join(", ")}
          </div>
        ) : null}

        <div className="row tight">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`btn sm${task.status === s ? " primary" : ""}`}
              onClick={() => quickStatus(s)}
              disabled={pending || task.status === s}
            >
              {s}
            </button>
          ))}
          <button className="btn ghost sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Less" : "Notes & images"}
          </button>
        </div>

        {open ? (
          <div className="stack-v" style={{ gap: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <form className="form-grid" action={save}>
              <label className="field span-2">
                <span>Start date</span>
                <input type="date" name="startDate" defaultValue={task.startDate} />
              </label>
              <label className="field span-2">
                <span>Due date</span>
                <input type="date" name="dueDate" defaultValue={task.dueDate} />
              </label>
              <label className="field span-4">
                <span>Notes / links</span>
                <textarea name="notes" defaultValue={task.notes} />
              </label>
              <div className="span-4">
                <button className="btn primary" type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>

            <div className="stack-v" style={{ gap: 8 }}>
              <h3>Reference images</h3>
              <Attachments taskId={task.id} attachments={task.attachments ?? []} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
