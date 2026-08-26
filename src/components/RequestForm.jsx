"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitRequest } from "@/lib/actions";
import { PRIORITIES } from "@/lib/constants";

export default function RequestForm({ slug }) {
  const [state, action, pending] = useActionState(submitRequest, {});
  const ref = useRef(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <section className="card">
      <header className="card-head">
        <h2>Request new work</h2>
        <span className="small muted">Goes to the Lukreative team for approval</span>
      </header>
      <form ref={ref} action={action} className="card-body form-grid">
        <input type="hidden" name="slug" value={slug} />

        <label className="field span-4">
          <span>What do you need?</span>
          <input
            type="text"
            name="title"
            required
            placeholder="Instagram carousel for the new summer menu"
          />
        </label>

        <label className="field span-4">
          <span>Any details, references or links</span>
          <textarea
            name="details"
            placeholder="Where it'll run, key messages, reference links, anything we should know…"
          />
        </label>

        <label className="field span-2">
          <span>Your name</span>
          <input type="text" name="requestedBy" placeholder="So we know who to reply to" />
        </label>

        <label className="field">
          <span>How urgent?</span>
          <select name="priority" defaultValue="Medium">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Needed by</span>
          <input type="date" name="neededBy" />
        </label>

        {state?.error ? <div className="notice err span-4">{state.error}</div> : null}
        {state?.ok ? (
          <div className="notice ok span-4">
            Sent. You&apos;ll see it below as “Awaiting approval” — we&apos;ll pick it up shortly.
          </div>
        ) : null}

        <div className="span-4">
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </section>
  );
}
