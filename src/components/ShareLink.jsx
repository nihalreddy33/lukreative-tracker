"use client";

import { useEffect, useState, useTransition } from "react";
import { regenerateShareToken } from "@/lib/actions";

/**
 * The client's share link. Built in the browser from window.location.origin so
 * it's always correct for wherever the app is actually running — localhost in
 * dev, the real domain once deployed.
 */
export default function ShareLink({ clientId, slug, token, compact }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/c/${slug}?k=${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="stack-v" style={{ gap: 8 }}>
      <div className="linkbox">
        <code title={url}>{origin ? url : "…"}</code>
        <button className="btn sm" onClick={copy} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
        {!compact ? (
          <a className="btn sm" href={url} target="_blank" rel="noreferrer">Open</a>
        ) : null}
      </div>
      {!compact ? (
        <form
          action={(fd) => start(() => regenerateShareToken(fd))}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Generate a new link? The old one stops working immediately and anyone holding it loses access."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={clientId} />
          <button className="btn ghost sm" type="submit" disabled={pending}>
            {pending ? "Generating…" : "Regenerate link"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
