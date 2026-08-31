"use client";

import { useEffect, useState } from "react";
import { prettySize } from "@/lib/attachments";

/**
 * The "N images" badge on a task row, made viewable.
 *
 * Opening Edit just to look at a reference is a lot of clicks for something
 * people do constantly, so the badge itself opens a viewer.
 */
export default function AttachmentPeek({ attachments = [] }) {
  const [index, setIndex] = useState(null);
  const open = index !== null;
  const current = open ? attachments[index] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % attachments.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + attachments.length) % attachments.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, attachments.length]);

  if (!attachments.length) return null;

  return (
    <>
      <button
        type="button"
        className="pill slate peek-badge"
        onClick={() => setIndex(0)}
        title="View reference images"
      >
        🖼 {attachments.length} image{attachments.length === 1 ? "" : "s"}
      </button>

      {open ? (
        <div className="lightbox" onClick={() => setIndex(null)} role="dialog" aria-label="Reference images">
          <img
            src={`/api/attachments/${current.id}`}
            alt={current.caption || current.filename}
            onClick={(e) => e.stopPropagation()}
          />
          <p>
            {current.filename} · {prettySize(current.size)}
            {current.width ? ` · ${current.width}×${current.height}` : ""}
            {attachments.length > 1 ? ` · ${index + 1} of ${attachments.length}` : ""}
          </p>
          <div className="row tight" onClick={(e) => e.stopPropagation()}>
            {attachments.length > 1 ? (
              <>
                <button className="btn sm" onClick={() => setIndex((i) => (i - 1 + attachments.length) % attachments.length)}>‹ Prev</button>
                <button className="btn sm" onClick={() => setIndex((i) => (i + 1) % attachments.length)}>Next ›</button>
              </>
            ) : null}
            <a className="btn sm" href={`/api/attachments/${current.id}`} target="_blank" rel="noreferrer">
              Open full size
            </a>
            <button className="btn sm" onClick={() => setIndex(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
