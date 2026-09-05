"use client";

import { useState } from "react";
import SendWhatsApp from "./SendWhatsApp";

/**
 * One person's daily nudge: the tasks themselves, plus the exact text to paste
 * into WhatsApp. The message is built on the server so what's shown here is
 * literally what gets copied.
 */
export default function ReminderCard({ name, message, counts, memberId, hasPhone, children }) {
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowText(true); // clipboard blocked — let them select it by hand
    }
  };

  return (
    <section className="card">
      <header className="card-head">
        <div className="row tight">
          <h2>{name}</h2>
          {counts.overdue ? <span className="pill red">{counts.overdue} overdue</span> : null}
          {counts.dueToday ? <span className="pill amber">{counts.dueToday} today</span> : null}
          {!counts.open ? <span className="pill green">clear</span> : null}
        </div>
        <div className="row tight">
          <button className="btn sm primary" onClick={copy} disabled={!counts.open}>
            {copied ? "Copied ✓" : "Copy for WhatsApp"}
          </button>
          <a
            className="btn sm"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!counts.open}
          >
            Send
          </a>
          <button className="btn sm ghost" onClick={() => setShowText((v) => !v)}>
            {showText ? "Hide text" : "Preview"}
          </button>
          {counts.open ? (
            <SendWhatsApp memberId={memberId} name={name} hasPhone={hasPhone} />
          ) : null}
        </div>
      </header>

      <div className="card-body stack-v" style={{ gap: 12 }}>
        {showText ? (
          <textarea
            readOnly
            value={message}
            onFocus={(e) => e.target.select()}
            style={{
              minHeight: 200,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
