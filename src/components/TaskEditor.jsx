"use client";

import { useState, useTransition } from "react";
import { updateTask, addPrerequisite, removePrerequisite } from "@/lib/actions";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { fmt } from "@/lib/dates";

/**
 * Full edit for one task, plus its prerequisites. Opens over the page rather
 * than expanding the row, so the same control works on a phone.
 */
export default function TaskEditor({ task, clients, members, candidates }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("new"); // how to add a prerequisite
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();

  const blocking = (task.prerequisites ?? []).filter((p) => p.status !== "Completed");

  if (!open) {
    return (
      <button className="btn sm" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  }

  const run = (action, fd, after) =>
    start(async () => {
      setError(null);
      const res = await action(fd);
      if (res?.error) setError(res.error);
      else after?.();
    });

  return (
    <>
      <div className="modal-scrim" onClick={() => setOpen(false)} />
      <div className="modal" role="dialog" aria-label={`Edit ${task.title}`}>
        <header className="card-head">
          <h2>Edit task</h2>
          <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
        </header>

        <div className="modal-body stack-v">
          <form
            className="form-grid"
            action={(fd) => run(updateTask, fd, () => setOpen(false))}
          >
            <input type="hidden" name="id" value={task.id} />

            <label className="field span-4">
              <span>Task name</span>
              <input type="text" name="title" defaultValue={task.title} required />
            </label>

            <label className="field span-2">
              <span>Client</span>
              <select name="clientId" defaultValue={task.clientId ?? ""}>
                <option value="">Internal / none</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="field span-2">
              <span>Owner</span>
              <select name="assigneeId" defaultValue={task.assigneeId ?? ""}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>

            <label className="field span-2">
              <span>Campaign / channel</span>
              <input type="text" name="channel" defaultValue={task.channel} />
            </label>

            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue={task.priority}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={task.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

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

            <label className="field span-2">
              <span>Visible to client</span>
              <select name="visibleToClient" defaultValue={task.visibleToClient ? "yes" : "no"}>
                <option value="yes">Yes — show in their portal</option>
                <option value="no">No — internal only</option>
              </select>
            </label>

            <div className="span-4 row">
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </button>
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />

          <div className="stack-v" style={{ gap: 10 }}>
            <div className="spread">
              <h3>Waiting on {blocking.length ? `(${blocking.length} outstanding)` : ""}</h3>
              <div className="row tight">
                <button
                  className={`btn sm${mode === "new" ? " primary" : ""}`}
                  onClick={() => setMode("new")}
                >
                  New task
                </button>
                <button
                  className={`btn sm${mode === "existing" ? " primary" : ""}`}
                  onClick={() => setMode("existing")}
                >
                  Existing
                </button>
              </div>
            </div>

            {task.prerequisites?.length ? (
              <div className="stack-v" style={{ gap: 6 }}>
                {task.prerequisites.map((p) => (
                  <div className="spread dep-row" key={p.id}>
                    <span style={{ minWidth: 0 }}>
                      <span className={`pill ${p.status === "Completed" ? "green" : "amber"}`}>
                        {p.status === "Completed" ? "done" : p.status}
                      </span>{" "}
                      <span style={{ fontSize: 13.5 }}>{p.title}</span>
                      <span className="small muted">
                        {p.assignee?.name ? ` · ${p.assignee.name}` : " · unassigned"}
                        {p.dueDate ? ` · ${fmt(p.dueDate)}` : ""}
                      </span>
                    </span>
                    <form action={(fd) => run(removePrerequisite, fd)}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="prerequisiteId" value={p.id} />
                      <button className="btn ghost sm" type="submit">Remove</button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">
                Nothing blocking this yet. Add the work that has to happen first.
              </p>
            )}

            {mode === "new" ? (
              <form className="form-grid" action={(fd) => run(addPrerequisite, fd)}>
                <input type="hidden" name="taskId" value={task.id} />
                <label className="field span-2">
                  <span>What has to happen first?</span>
                  <input type="text" name="newTitle" required placeholder="T-shirt slogan copy" />
                </label>
                <label className="field">
                  <span>Assign to</span>
                  <select name="newAssigneeId" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Needed by</span>
                  <input type="date" name="newDueDate" />
                </label>
                <div className="span-4">
                  <button className="btn" type="submit" disabled={pending}>
                    {pending ? "Adding…" : "Add prerequisite"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="row" action={(fd) => run(addPrerequisite, fd)}>
                <input type="hidden" name="taskId" value={task.id} />
                <select name="prerequisiteId" defaultValue="" style={{ flex: 1 }}>
                  <option value="">Choose an existing task…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.client?.name ? ` — ${c.client.name}` : ""}
                    </option>
                  ))}
                </select>
                <button className="btn" type="submit" disabled={pending}>Link</button>
              </form>
            )}

            {error ? <div className="notice err">{error}</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
