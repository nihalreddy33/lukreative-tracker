"use client";

import { useState, useTransition } from "react";
import { sendTestWhatsApp } from "@/lib/actions";

/**
 * A single test send, to any number. Shows what was sent and what Interakt
 * said back, because "it didn't arrive" is otherwise impossible to diagnose:
 * an unapproved template, a number not on WhatsApp and a wrong language code
 * all look identical from the outside.
 */
export default function WhatsAppTest() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null);
  const [pending, start] = useTransition();

  const run = (fd) =>
    start(async () => {
      setState(null);
      setState(await sendTestWhatsApp(fd));
    });

  if (!open) {
    return (
      <button className="btn sm ghost" onClick={() => setOpen(true)}>
        Test WhatsApp setup
      </button>
    );
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Test WhatsApp</h2>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
      </header>
      <div className="card-body stack-v" style={{ gap: 12 }}>
        <p className="small muted">
          Sends one sample reminder — &ldquo;3 tasks needing attention, 1 overdue&rdquo; — to the
          number you enter. Use your own number first.
        </p>

        <form className="form-grid" action={run}>
          <label className="field span-2">
            <span>WhatsApp number</span>
            <input type="tel" name="phone" required placeholder="98765 43210" />
          </label>
          <label className="field span-2">
            <span>Name to greet</span>
            <input type="text" name="name" placeholder="Nihal" />
          </label>
          <div className="span-4">
            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send test message"}
            </button>
          </div>
        </form>

        {state?.config ? (
          <div className="stack-v" style={{ gap: 4 }}>
            <h3 className="small muted">Current settings</h3>
            <pre className="cfg-dump">
              {Object.entries(state.config).map(([k, v]) => `${k.padEnd(13)} ${v}`).join("\n")}
            </pre>
          </div>
        ) : null}

        {state?.preview ? (
          <div className="notice info">
            <strong>Nothing was sent — INTERAKT_API_KEY isn&apos;t set.</strong>
            <div style={{ marginTop: 6 }}>
              It would have gone to {state.phone} with values:{" "}
              <code>{JSON.stringify(state.bodyValues)}</code>
            </div>
          </div>
        ) : null}

        {state?.ok ? (
          <div className="notice ok">
            Sent to {state.phone}. Interakt id: {state.id ?? "—"}. If it doesn&apos;t arrive,
            the template is likely not approved yet.
          </div>
        ) : null}

        {state?.error ? (
          <div className="notice err">
            <strong>{state.error}</strong>
            {state.status ? <div className="small">HTTP {state.status}</div> : null}
            {state.details ? <pre className="cfg-dump">{state.details}</pre> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
