"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions";

function Item({ href, label, count, alert, dot, exact, onNavigate }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className={`nav-item${active ? " active" : ""}`} onClick={onNavigate}>
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
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Collapse the menu after navigating, or the new page opens behind it.
  useEffect(() => setOpen(false), [path]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile only: a slim bar so content starts at the top of the screen. */}
      <div className="nav-bar">
        <Link href="/" className="nav-brand" onClick={close}>
          <img src="/logo.png" alt="Lukreative Studio" className="brand-logo" />
          <span className="brand-sub">Task Tracker</span>
        </Link>
        <button
          className="nav-burger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {pendingCount > 0 && !open ? <span className="nav-count alert">{pendingCount}</span> : null}
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
      </div>

      <nav className={`nav${open ? " open" : ""}`}>
        <Link href="/" className="nav-brand nav-brand-desktop" onClick={close}>
          <img src="/logo.png" alt="Lukreative Studio" className="brand-logo" />
          <span className="brand-sub">Task Tracker</span>
        </Link>

        <div className="nav-group">
          <Item href="/" label="Overview" exact onNavigate={close} />
          <Item href="/tasks" label="All tasks" count={openCount} onNavigate={close} />
          <Item
            href="/requests"
            label="Client requests"
            count={pendingCount}
            alert={pendingCount > 0}
            onNavigate={close}
          />
          <Item href="/calendar" label="Calendar" exact onNavigate={close} />
        <Item href="/reminders" label="Daily reminders" exact onNavigate={close} />
        <Item href="/recurring" label="Repeating work" exact onNavigate={close} />
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
              onNavigate={close}
            />
          ))}
          <Item href="/clients" label="Manage clients" exact onNavigate={close} />
        </div>

        <div className="nav-group">
          <Item href="/team" label="Team" exact onNavigate={close} />
          <Item href="/import" label="Import from Excel" exact onNavigate={close} />
        </div>

        <div className="nav-foot">
          <form action={logoutAction}>
            <button className="btn ghost sm" style={{ color: "#94a3b8" }} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {open ? <button className="nav-scrim" onClick={close} aria-label="Close menu" /> : null}
    </>
  );
}
