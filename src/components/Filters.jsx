"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** URL-backed filters, so a filtered view is a link you can share or bookmark. */
export default function Filters({ clients, members, statuses, priorities, hideClient }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  const val = (k) => params.get(k) ?? "";
  const dirty = [...params.keys()].some((k) => k !== "view");

  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        type="text"
        placeholder="Search tasks…"
        defaultValue={val("q")}
        onChange={(e) => set("q", e.target.value)}
        style={{ width: 220 }}
      />
      {!hideClient ? (
        <select value={val("client")} onChange={(e) => set("client", e.target.value)} style={{ width: "auto" }}>
          <option value="">All clients</option>
          <option value="none">Internal / none</option>
          {clients.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      ) : null}
      <select value={val("owner")} onChange={(e) => set("owner", e.target.value)} style={{ width: "auto" }}>
        <option value="">All owners</option>
        <option value="none">Unassigned</option>
        {members.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
      </select>
      <select value={val("status")} onChange={(e) => set("status", e.target.value)} style={{ width: "auto" }}>
        <option value="">Open tasks</option>
        <option value="all">All statuses</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        <option value="overdue">Overdue only</option>
      </select>
      <select value={val("priority")} onChange={(e) => set("priority", e.target.value)} style={{ width: "auto" }}>
        <option value="">All priorities</option>
        {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      {dirty ? (
        <button className="btn ghost sm" onClick={() => router.replace(path, { scroll: false })}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
