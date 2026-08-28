"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createImportantDay, deleteImportantDay } from "@/lib/actions";
import { DAY_KINDS, KIND_TONE } from "@/lib/important-days-seed";
import { fmt } from "@/lib/dates";

export default function ImportantDayManager({ days }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const add = (fd) =>
    start(async () => {
      setError(null);
      const res = await createImportantDay(fd);
      if (res?.error) return setError(res.error);
      router.refresh();
      setOpen(false);
    });

  const remove = (id, name) =>
    start(async () => {
      if (!window.confirm(`Remove "${name}" from the calendar?`)) return;
      const fd = new FormData();
      fd.append("id", String(id));
      await deleteImportantDay(fd);
      router.refresh();
    });

  const annual = days.filter((d) => d.annual);
  const dated = days.filter((d) => !d.annual);

  const List = ({ items, label }) =>
    items.length ? (
      <div className="stack-v" style={{ gap: 6 }}>
        <h3 className="small muted">{label}</h3>
        <div className="row" style={{ gap: 6 }}>
          {items.map((d) => (
            <span key={d.id} className="chip" title={d.note || undefined}>
              <span className={`pill ${KIND_TONE[d.kind] || "brand"}`} style={{ padding: "1px 6px" }}>
                {d.annual ? fmt(d.date).replace(/ \d{4}$/, "") : fmt(d.date)}
              </span>
              {d.name}
              <button
                type="button"
                className="btn ghost sm"
                style={{ padding: "0 4px", minHeight: 0 }}
                onClick={() => remove(d.id, d.name)}
                disabled={pending}
                aria-label={`Remove ${d.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <section className="card">
      <header className="card-head">
        <h2>Festivals &amp; important days</h2>
        <button className="btn sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "+ Add a day"}
        </button>
      </header>
      <div className="card-body stack-v" style={{ gap: 14 }}>
        {open ? (
          <form className="form-grid" action={add}>
            <label className="field span-2">
              <span>Name</span>
              <input type="text" name="name" required placeholder="Bathukamma" />
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" name="date" required />
            </label>
            <label className="field">
              <span>Type</span>
              <select name="kind" defaultValue="Festival">
                {DAY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="field span-2">
              <span>Repeats</span>
              <select name="annual" defaultValue="no">
                <option value="no">This date only — for festivals that move each year</option>
                <option value="yes">Same date every year</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Note (optional)</span>
              <input type="text" name="note" placeholder="Anything worth remembering" />
            </label>
            {error ? <div className="notice err span-4">{error}</div> : null}
            <div className="span-4 row">
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add to calendar"}
              </button>
            </div>
          </form>
        ) : null}

        <List items={annual} label="Same date every year" />
        <List items={dated} label="Dated — these move each year, so add next year's when you know them" />

        {!days.length ? <p className="small muted">No days on the calendar yet.</p> : null}
      </div>
    </section>
  );
}
