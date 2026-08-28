"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CalendarFilters({ clients, members }) {
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

  return (
    <div className="row" style={{ gap: 8 }}>
      <select value={val("client")} onChange={(e) => set("client", e.target.value)} style={{ width: "auto" }}>
        <option value="">All clients</option>
        <option value="none">Internal / none</option>
        {clients.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      <select value={val("owner")} onChange={(e) => set("owner", e.target.value)} style={{ width: "auto" }}>
        <option value="">All owners</option>
        <option value="none">Unassigned</option>
        {members.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
      </select>
      <select value={val("hideDone")} onChange={(e) => set("hideDone", e.target.value)} style={{ width: "auto" }}>
        <option value="">Show completed</option>
        <option value="yes">Hide completed</option>
      </select>
      {[...params.keys()].some((k) => !["y", "m"].includes(k)) ? (
        <button
          className="btn ghost sm"
          onClick={() => {
            const next = new URLSearchParams();
            if (params.get("y")) next.set("y", params.get("y"));
            if (params.get("m")) next.set("m", params.get("m"));
            router.replace(`${path}?${next.toString()}`, { scroll: false });
          }}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
