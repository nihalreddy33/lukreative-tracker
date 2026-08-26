"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/actions";

const SWATCHES = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f43f5e"];

export default function NewClientForm() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(SWATCHES[0]);
  const [pending, start] = useTransition();
  const ref = useRef(null);

  if (!open) {
    return <button className="btn primary" onClick={() => setOpen(true)}>+ Add client</button>;
  }

  return (
    <section className="card" style={{ width: "100%" }}>
      <header className="card-head">
        <h2>Add client</h2>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
      </header>
      <form
        ref={ref}
        className="card-body form-grid"
        action={(fd) =>
          start(async () => {
            await createClient(fd);
            ref.current?.reset();
            setOpen(false);
          })
        }
      >
        <label className="field span-2">
          <span>Client name</span>
          <input type="text" name="name" required autoFocus placeholder="Akan Brewery" />
        </label>
        <label className="field">
          <span>Main contact</span>
          <input type="text" name="contactName" placeholder="Name" />
        </label>
        <label className="field">
          <span>Contact email</span>
          <input type="email" name="contactEmail" placeholder="name@company.com" />
        </label>
        <div className="field span-4">
          <span>Colour</span>
          <div className="row tight">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                style={{
                  width: 26, height: 26, borderRadius: 8, cursor: "pointer",
                  background: c,
                  border: color === c ? "2px solid var(--ink)" : "1px solid var(--line)",
                }}
              />
            ))}
            <input type="hidden" name="color" value={color} />
          </div>
        </div>
        <div className="span-4 row">
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add client & create share link"}
          </button>
          <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
