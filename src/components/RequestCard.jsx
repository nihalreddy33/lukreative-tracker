"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveRequest, declineRequest } from "@/lib/actions";
import { PRIORITIES } from "@/lib/constants";
import { fmt } from "@/lib/dates";

export default function RequestCard({ req, members }) {
  const [mode, setMode] = useState(null); // null | "approve" | "decline"
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <section className="card">
      <div className="card-body stack-v" style={{ gap: 12 }}>
        <div className="spread" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div className="row tight" style={{ marginBottom: 4 }}>
              <span className="dot" style={{ background: req.client.color }} />
              <span className="small muted">{req.client.name}</span>
              <span className="small muted">·</span>
              <span className="small muted">
                {req.requestedBy ? `${req.requestedBy}, ` : ""}
                {fmt(req.createdAt.toISOString().slice(0, 10))}
              </span>
            </div>
            <h2>{req.title}</h2>
            {req.details ? (
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                {req.details}
              </p>
            ) : null}
          </div>
          <div className="row tight nowrap">
            <span className={`pill ${req.priority === "High" ? "red" : req.priority === "Low" ? "slate" : "amber"}`}>
              {req.priority}
            </span>
            {req.neededBy ? <span className="chip">Needed by {fmt(req.neededBy)}</span> : null}
          </div>
        </div>

        {mode === null ? (
          <div className="row">
            <button className="btn primary" onClick={() => setMode("approve")}>Approve</button>
            <button className="btn" onClick={() => setMode("decline")}>Decline</button>
          </div>
        ) : null}

        {mode === "approve" ? (
          <form
            className="form-grid"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
            action={(fd) => start(async () => { await approveRequest(fd); router.refresh(); })}
          >
            <input type="hidden" name="id" value={req.id} />
            <label className="field span-2">
              <span>Task name</span>
              <input type="text" name="title" defaultValue={req.title} required />
            </label>
            <label className="field">
              <span>Assign to</span>
              <select name="assigneeId" defaultValue="">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue={req.priority}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Due date</span>
              <input type="date" name="dueDate" defaultValue={req.neededBy || ""} />
            </label>
            <label className="field">
              <span>Campaign / channel</span>
              <input type="text" name="channel" placeholder="Meta Ads, Video…" />
            </label>
            <label className="field span-2">
              <span>Note back to the client (optional)</span>
              <input type="text" name="decisionNote" placeholder="Scheduled for next week." />
            </label>
            <div className="span-4 row">
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Approving…" : "Approve & create task"}
              </button>
              <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        ) : null}

        {mode === "decline" ? (
          <form
            className="stack-v"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 14, gap: 12 }}
            action={(fd) => start(async () => { await declineRequest(fd); router.refresh(); })}
          >
            <input type="hidden" name="id" value={req.id} />
            <label className="field">
              <span>Reason (the client will see this)</span>
              <input
                type="text"
                name="decisionNote"
                required
                placeholder="Outside the current retainer — let's discuss on the next call."
              />
            </label>
            <div className="row">
              <button className="btn danger" type="submit" disabled={pending}>
                {pending ? "Declining…" : "Decline request"}
              </button>
              <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
