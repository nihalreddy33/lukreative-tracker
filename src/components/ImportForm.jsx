"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportForm() {
  const [state, setState] = useState(null); // null | {busy} | {ok,…} | {error}
  const [name, setName] = useState("");
  const ref = useRef(null);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    const file = ref.current?.files?.[0];
    if (!file) return setState({ error: "Choose a .xlsx file first." });

    setState({ busy: true });
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) return setState({ error: data.error || `Upload failed (${res.status}).` });
      setState(data);
      router.refresh();
    } catch (err) {
      setState({ error: `Upload failed: ${err.message}` });
    }
  }

  return (
    <form onSubmit={submit} className="stack-v" style={{ gap: 14 }}>
      <label className="field">
        <span>Tracker file (.xlsx)</span>
        <input
          ref={ref}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setName(e.target.files?.[0]?.name ?? "");
            setState(null);
          }}
          style={{ fontSize: 13.5 }}
        />
      </label>

      {name ? <p className="small muted">Selected: {name}</p> : null}

      {state?.error ? <div className="notice err">{state.error}</div> : null}

      {state?.ok ? (
        <div className="notice ok">
          Imported {state.total} tasks — {state.created} added, {state.updated} updated —
          across {state.clients} clients and {state.members} team members.
          <div style={{ marginTop: 6 }}>
            Share links are on the <a href="/clients">Clients</a> page.
          </div>
        </div>
      ) : null}

      <div className="row">
        <button className="btn primary" type="submit" disabled={state?.busy}>
          {state?.busy ? "Importing…" : "Import tracker"}
        </button>
      </div>
    </form>
  );
}
