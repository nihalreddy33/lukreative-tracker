import Link from "next/link";
import AutoForm from "./AutoForm";
import ConfirmButton from "./ConfirmButton";
import TaskEditor from "./TaskEditor";
import { PriorityPill, Empty } from "./ui";
import { updateTask, deleteTask } from "@/lib/actions";
import { STATUSES, PRIORITIES, STATUS_TONE } from "@/lib/constants";
import { fmt, isOverdue, today } from "@/lib/dates";
import { lateBy } from "@/lib/metrics";

/**
 * The agency task table. Status, priority, owner and due date are edited in
 * place — no modal — because the daily job here is nudging fields, not
 * authoring long records.
 */
export default function TaskTable({ tasks, members, clients = [], showClient = true, emptyText = "No tasks match these filters." }) {
  const from = today();
  if (!tasks.length) return <Empty>{emptyText}</Empty>;

  return (
    <div className="table-wrap">
      <table className="tbl stack-mobile">
        <thead>
          <tr>
            <th>Task</th>
            {showClient ? <th>Client</th> : null}
            <th>Owner</th>
            <th>Status</th>
            <th>Priority</th>
            <th className="nowrap">Due</th>
            <th>Client sees</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const late = isOverdue(t, from);
            const blocked = (t.prerequisites ?? []).filter((p) => p.status !== "Completed");
            return (
              <tr key={t.id}>
                <td data-label="" style={{ minWidth: 240 }}>
                  <div className="t-title">{t.title}</div>
                  <div className="t-sub">
                    {[t.channel, t.notes?.split("\n")[0]].filter(Boolean).join(" · ") || `#${t.id}`}
                  </div>
                  {t.recurrenceId ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="pill brand" title="Created from a repeating series">
                        ↻ repeats
                      </span>
                    </div>
                  ) : null}
                  {t.attachments?.length ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="pill slate">
                        {t.attachments.length} image{t.attachments.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : null}
                  {blocked.length ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="pill amber" title={blocked.map((b) => b.title).join(", ")}>
                        waiting on {blocked.length === 1 ? blocked[0].title : `${blocked.length} tasks`}
                      </span>
                    </div>
                  ) : null}
                </td>

                {showClient ? (
                  <td data-label="Client" className="nowrap small">
                    {t.client ? (
                      <Link href={`/clients/${t.client.slug}`} className="row tight" style={{ color: "inherit" }}>
                        <span className="dot" style={{ background: t.client.color }} />
                        {t.client.name}
                      </Link>
                    ) : (
                      <span className="muted">Internal</span>
                    )}
                  </td>
                ) : null}

                <td data-label="Owner" className="nowrap">
                  <AutoForm action={updateTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <select className="inline-select" name="assigneeId" defaultValue={t.assigneeId ?? ""}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </AutoForm>
                </td>

                <td data-label="Status" className="nowrap">
                  <AutoForm action={updateTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <select
                      className={`inline-select pill ${STATUS_TONE[t.status] || "slate"}`}
                      name="status"
                      defaultValue={t.status}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </AutoForm>
                </td>

                <td data-label="Priority" className="nowrap">
                  <AutoForm action={updateTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <select className="inline-select" name="priority" defaultValue={t.priority}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </AutoForm>
                </td>

                <td data-label="Due" className="nowrap">
                  <AutoForm action={updateTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={t.dueDate}
                      style={{ width: 150, fontSize: 12.5, padding: "4px 7px" }}
                    />
                  </AutoForm>
                  {late ? (
                    <div style={{ marginTop: 3 }}>
                      <span className="pill red">{lateBy(t, from)}d late</span>
                    </div>
                  ) : t.status === "Completed" && t.completedDate ? (
                    <div className="t-sub">done {fmt(t.completedDate)}</div>
                  ) : null}
                </td>

                <td data-label="Client sees" className="nowrap">
                  <AutoForm action={updateTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <select
                      className="inline-select"
                      name="visibleToClient"
                      defaultValue={t.visibleToClient ? "yes" : "no"}
                    >
                      <option value="yes">Visible</option>
                      <option value="no">Hidden</option>
                    </select>
                  </AutoForm>
                </td>

                <td data-label="" className="nowrap">
                  <span className="row tight">
                  <TaskEditor
                    task={t}
                    clients={clients}
                    members={members}
                    candidates={tasks.filter((o) => o.id !== t.id)}
                  />
                  <ConfirmButton
                    action={deleteTask}
                    hidden={{ id: t.id }}
                    message={`Delete "${t.title}"? This can't be undone.`}
                  >
                    Delete
                  </ConfirmButton>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { PriorityPill };
