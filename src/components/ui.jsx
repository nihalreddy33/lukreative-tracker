import { STATUS_TONE, PRIORITY_TONE, REQUEST_TONE } from "@/lib/constants";

export function Pill({ tone = "slate", children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export const StatusPill = ({ value }) => (
  <Pill tone={STATUS_TONE[value] || "slate"}>{value}</Pill>
);

export const PriorityPill = ({ value }) => (
  <Pill tone={PRIORITY_TONE[value] || "slate"}>{value}</Pill>
);

export const RequestPill = ({ value }) => (
  <Pill tone={REQUEST_TONE[value] || "slate"}>{value}</Pill>
);

export function Stat({ label, value, foot, tone }) {
  return (
    <div className={`card stat ${tone || ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  );
}

export function Card({ title, action, children, bodyless }) {
  return (
    <section className="card">
      {title ? (
        <header className="card-head">
          <h2>{title}</h2>
          {action}
        </header>
      ) : null}
      {bodyless ? children : <div className="card-body">{children}</div>}
    </section>
  );
}

export function BarList({ items, empty = "Nothing to show yet." }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="empty">{empty}</div>;
  return (
    <div>
      {items.map((i) => (
        <div className="bar-row" key={i.name}>
          <span className="name" title={i.name}>{i.name}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{
                width: `${(i.value / max) * 100}%`,
                background: i.color || undefined,
              }}
            />
          </span>
          <span className="num">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

/** done / active / late / hold split as one 100%-wide bar. */
export function StackBar({ done = 0, active = 0, late = 0, hold = 0 }) {
  const total = done + active + late + hold;
  if (!total) return <div className="stack" />;
  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className="stack" title={`${done} done · ${active} active · ${late} late · ${hold} on hold`}>
      <i className="done" style={{ width: pct(done) }} />
      <i className="active" style={{ width: pct(active) }} />
      <i className="late" style={{ width: pct(late) }} />
      <i className="hold" style={{ width: pct(hold) }} />
    </div>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;
