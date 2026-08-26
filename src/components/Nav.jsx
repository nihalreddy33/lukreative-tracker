"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";

function Item({ href, label, count, alert, dot, exact }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className={`nav-item${active ? " active" : ""}`}>
      <span className="row tight" style={{ minWidth: 0 }}>
        {dot ? <span className="nav-dot" style={{ background: dot }} /> : null}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </span>
      {count ? <span className={`nav-count${alert ? " alert" : ""}`}>{count}</span> : null}
    </Link>
  );
}

export default function Nav({ clients, openCount, pendingCount }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-mark">L</span>
        <span>
          <strong>Lukreative</strong>
          <span>Task Tracker</span>
        </span>
      </div>

      <div className="nav-group">
        <Item href="/" label="Overview" exact />
        <Item href="/tasks" label="All tasks" count={openCount} />
        <Item
          href="/requests"
          label="Client requests"
          count={pendingCount}
          alert={pendingCount > 0}
        />
      </div>

      <div className="nav-group">
        <div className="nav-label">Clients</div>
        {clients.map((c) => (
          <Item
            key={c.slug}
            href={`/clients/${c.slug}`}
            label={c.name}
            count={c.openCount}
            dot={c.color}
          />
        ))}
        <Item href="/clients" label="Manage clients" exact />
      </div>

      <div className="nav-group">
        <Item href="/team" label="Team" exact />
      </div>

      <div className="nav-foot">
        <form action={logoutAction}>
          <button className="btn ghost sm" style={{ color: "#94a3b8" }} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
